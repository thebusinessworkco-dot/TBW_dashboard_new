import fs from 'fs';
import vm from 'vm';

// Load candidate patched code
const patchedCode = fs.readFileSync('backups/candidate_Language_Name_Business_Purpose_code.js', 'utf8');

// Helper to simulate the n8n Code node environment
function createRunner() {
  const globalStaticData = {
    customers: {},
    processedMsgIds: [],
    recentMsgTimestamps: {},
    confirmedBookingKeys: {},
    publicFaqCache: {},
    dispatchedAdminSessions: [],
    lastActionTime: {},
    lastActionValue: {},
  };

  async function executeNode(rawInputJson) {
    const sandbox = {
      $input: {
        first: () => ({ json: rawInputJson }),
      },
      $getWorkflowStaticData: (scope) => {
        if (scope === 'global') return globalStaticData;
        return {};
      },
      console,
      Date,
      Math,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      Intl,
      BigInt,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    const wrappedCode = `(async () => {\n${patchedCode}\n})()`;
    const script = new vm.Script(wrappedCode);
    const context = vm.createContext(sandbox);
    return await script.runInContext(context);
  }

  return { executeNode, globalStaticData };
}

console.log('=== TEST SUITE: TBW WhatsApp Code Node Patch ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  // -------------------------------------------------------------
  // TEST 1: Exact Execution 11795 payload (production crash replay)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Exact Execution 11795 Payload (5:30 pm slot) ---');
  const runner1 = createRunner();
  const phone1 = '917821840347';
  runner1.globalStaticData.customers[phone1] = {
    phone: phone1,
    name: '🎃',
    profileName: '🎃',
    business: '',
    serviceCategory: '',
    serviceDetail: '',
    purpose: '',
    stage: 'appt_time',
    apptDate: '2026-10-26',
    language: 'en',
    selected_language: 'en',
    sessionId: 'wa_sess_test_11795',
    sessionStarted: Date.now() - 60000,
    lastCustomerMsgTime: Date.now() - 30000,
    lastBotMsgTime: Date.now() - 30000,
    classification: 'RETURNING_CUSTOMER',
    activeBooking: null,
    isRescheduling: false,
    pendingQuestion: '',
    created: Date.now() - 60000,
    updated: Date.now() - 30000,
  };

  const exec11795Payload = {
    messaging_product: 'whatsapp',
    metadata: {
      display_phone_number: '917972020292',
      phone_number_id: '1392092143987065'
    },
    contacts: [
      {
        profile: { name: '🎃' },
        wa_id: '917821840347',
        user_id: 'IN.1437690224363523'
      }
    ],
    messages: [
      {
        context: {
          from: '917972020292',
          id: 'wamid.HBgMOTE3ODIxODQwMzQ3FQIAERgSQzEzNDc0MjBGNDY3MDc4NzUwAA=='
        },
        from: '917821840347',
        from_user_id: 'IN.1437690224363523',
        id: 'wamid.HBgMOTE3ODIxODQwMzQ3FQIAEhggQUNDOEY3N0QxMzQxMTE0QzgyMjVCNUY2NzExOEQ1NzcA',
        timestamp: '1793013069',
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: {
            id: 'tbw_slot_20261026_1730',
            title: '5:30 pm - 6:00 pm'
          }
        }
      }
    ],
    field: 'messages'
  };

  try {
    const res1 = await runner1.executeNode(exec11795Payload);
    assert(Array.isArray(res1) && res1.length === 1, 'Node returned single item output without throwing RangeError');
    const out1 = res1[0].json;
    assert(out1.sessionStage === 'appt_confirm', 'Customer stage transitioned to appt_confirm');
    assert(out1.apptStart === '2026-10-26T12:00:00.000Z', 'apptStart is valid UTC ISO corresponding to 17:30 IST');
    assert(out1.apptEnd === '2026-10-26T12:30:00.000Z', 'apptEnd is valid UTC ISO corresponding to 18:00 IST (no minute 60!)');
    assert(out1.apptDate === '2026-10-26', 'apptDate is 2026-10-26');
    assert(out1.reply.includes('5:30 pm'), 'Reply confirms 5:30 pm appointment time');
    assert(out1.waPayload?.interactive?.type === 'button', 'Interactive button menu returned for confirmation');
  } catch (err) {
    assert(false, `Execution 11795 failed: ${err.message}\n${err.stack}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Confirmation step for the 5:30 pm slot
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Confirmation of Selected Slot ---');
  const confirmPayload = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: '🎃' }, wa_id: phone1 }],
    messages: [{
      from: phone1,
      id: 'wamid.test_confirm_1',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'tbw_appt_confirm', title: 'Confirm Booking' }
      }
    }]
  };

  try {
    const res2 = await runner1.executeNode(confirmPayload);
    const out2 = res2[0].json;
    assert(out2.action === 'book', 'Action set to book');
    assert(out2.calendarStart === '2026-10-26T12:00:00.000Z', 'calendarStart is correct');
    assert(out2.calendarEnd === '2026-10-26T12:30:00.000Z', 'calendarEnd is correct');
    assert(typeof out2.bookingEventId === 'string' && out2.bookingEventId.length > 0, 'bookingEventId generated');
  } catch (err) {
    assert(false, `Confirm step failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Full End-to-End Booking Flow from "Hello"
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Full End-to-End Booking Flow ---');
  const runner3 = createRunner();
  const phone3 = '919876543210';

  // Step 3a: Customer says "Hello"
  const msgHello = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.hello_1', type: 'text', text: { body: 'Hello' } }]
  };
  const resHello = (await runner3.executeNode(msgHello))[0].json;
  assert(resHello.action === 'awaiting_language', 'Hello: prompts for language');
  assert(resHello.waPayload?.interactive?.type === 'list', 'Hello: sends language list');

  // Step 3b: Choose English
  const msgLang = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.lang_1', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'lang_en', title: 'English' } } }]
  };
  const resLang = (await runner3.executeNode(msgLang))[0].json;
  assert(resLang.selectedLanguage === 'en', 'Language set to English');
  assert(resLang.waPayload?.interactive?.action?.buttons?.some(b => b.reply.id === 'tbw_intent_appointment'), 'Main menu has Book Consultation button');

  // Step 3c: Click "Book Consultation"
  const msgBook = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.book_1', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'tbw_intent_appointment', title: 'Book Consultation' } } }]
  };
  const resBook = (await runner3.executeNode(msgBook))[0].json;
  assert(resBook.sessionStage === 'appt_date', 'Stage transitioned to appt_date');
  assert(resBook.waPayload?.interactive?.action?.sections?.[0]?.rows?.length === 6, 'Date picker offers 6 dates');

  // Step 3d: Choose Date (pick tomorrow's date so 10:00 AM is guaranteed to be in the future)
  const targetDate = resBook.waPayload.interactive.action.sections[0].rows[1].id.replace('tbw_date_', '');
  const msgDate = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.date_1', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: `tbw_date_${targetDate}`, title: 'Date' } } }]
  };
  const resDate = (await runner3.executeNode(msgDate))[0].json;
  assert(resDate.action === 'check_day', 'Action set to check_day for calendar availability check');
  assert(resDate.apptDate === targetDate, 'apptDate recorded');
  assert(resDate.calendarStart === `${targetDate}T10:00:00+05:30`, 'calendarStart matches IST 10:00 AM');
  assert(resDate.calendarEnd === `${targetDate}T22:00:00+05:30`, 'calendarEnd matches IST 10:00 PM');

  // Step 3e: Choose Time Slot (e.g. 10:00 am - 10:30 am, m=0)
  const cleanDateStr = targetDate.replace(/-/g, '');
  const msgSlot = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.slot_1', type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: `tbw_slot_${cleanDateStr}_1000`, title: '10:00 am - 10:30 am' } } }]
  };
  const resSlot = (await runner3.executeNode(msgSlot))[0].json;
  assert(resSlot.sessionStage === 'appt_confirm', 'Slot chosen: stage set to appt_confirm');
  assert(resSlot.reply.includes('10:00 am'), 'Confirmation message contains 10:00 am');

  // Step 3f: Confirm Booking
  const msgConfirm = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Alice' }, wa_id: phone3 }],
    messages: [{ from: phone3, id: 'wamid.conf_1', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'tbw_appt_confirm', title: 'Confirm Booking' } } }]
  };
  const resConfirm = (await runner3.executeNode(msgConfirm))[0].json;
  assert(resConfirm.action === 'book', 'Booking confirmed: action set to book');
  assert(resConfirm.calendarStart.length > 0 && resConfirm.calendarEnd.length > 0, 'Valid calendarStart and calendarEnd passed to Google Calendar');

  // -------------------------------------------------------------
  // TEST 4: Text-based and alternative slot replies
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Flexible Date/Time Format Parsing ---');

  // 4a. User types "5:30 pm - 6:00 pm" when apptDate is set
  const runner4a = createRunner();
  const phone4 = '919999988888';
  runner4a.globalStaticData.customers[phone4] = {
    phone: phone4,
    stage: 'appt_time',
    apptDate: '2026-10-28',
    language: 'en',
    sessionId: 'wa_sess_4a',
    lastCustomerMsgTime: Date.now() - 5000,
  };
  const msg4a = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Bob' }, wa_id: phone4 }],
    messages: [{ from: phone4, id: 'wamid.4a', type: 'text', text: { body: '5:30 pm - 6:00 pm' } }]
  };
  const res4a = (await runner4a.executeNode(msg4a))[0].json;
  assert(res4a.sessionStage === 'appt_confirm', 'Text "5:30 pm - 6:00 pm" parsed successfully');
  assert(res4a.apptStart === '2026-10-28T12:00:00.000Z', 'apptStart parsed to correct UTC ISO');

  // 4b. En-dash format "5:30 PM – 6:00 PM"
  const runner4b = createRunner();
  runner4b.globalStaticData.customers[phone4] = {
    phone: phone4,
    stage: 'appt_time',
    apptDate: '2026-10-28',
    language: 'en',
    sessionId: 'wa_sess_4b',
    lastCustomerMsgTime: Date.now() - 5000,
  };
  const msg4b = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Bob' }, wa_id: phone4 }],
    messages: [{ from: phone4, id: 'wamid.4b', type: 'text', text: { body: '5:30 PM – 6:00 PM' } }]
  };
  const res4b = (await runner4b.executeNode(msg4b))[0].json;
  assert(res4b.sessionStage === 'appt_confirm', 'En-dash "5:30 PM – 6:00 PM" parsed successfully');

  // 4c. Missing date safety test (Requirement 7: Do NOT silently substitute current date!)
  const runner4c = createRunner();
  const phone4c = '919999977777';
  runner4c.globalStaticData.customers[phone4c] = {
    phone: phone4c,
    stage: 'idle',
    apptDate: '', // MISSING!
    language: 'en',
    sessionId: 'wa_sess_4c',
    lastCustomerMsgTime: Date.now() - 5000,
  };
  const msg4c = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Charlie' }, wa_id: phone4c }],
    messages: [{ from: phone4c, id: 'wamid.4c', type: 'text', text: { body: 'Book 5:30 pm' } }]
  };
  const res4c = (await runner4c.executeNode(msg4c))[0].json;
  assert(res4c.sessionStage === 'appt_date', 'Missing date: prompts customer for date, does not crash or book');
  assert(res4c.waPayload?.interactive?.type === 'list', 'Sends date selection list');

  // 4d. Full ISO string reply
  const runner4d = createRunner();
  runner4d.globalStaticData.customers[phone4] = {
    phone: phone4,
    stage: 'appt_time',
    apptDate: '2026-10-28',
    language: 'en',
    sessionId: 'wa_sess_4d',
    lastCustomerMsgTime: Date.now() - 5000,
  };
  const msg4d = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Bob' }, wa_id: phone4 }],
    messages: [{ from: phone4, id: 'wamid.4d', type: 'text', text: { body: '2026-10-28T17:30:00+05:30' } }]
  };
  const res4d = (await runner4d.executeNode(msg4d))[0].json;
  assert(res4d.sessionStage === 'appt_confirm', 'ISO string parsed into slot');
  assert(res4d.apptStart === '2026-10-28T12:00:00.000Z', 'ISO apptStart correct');

  // 4e. Unix timestamp (10 digits)
  const runner4e = createRunner();
  runner4e.globalStaticData.customers[phone4] = {
    phone: phone4,
    stage: 'appt_time',
    apptDate: '2026-10-28',
    language: 'en',
    sessionId: 'wa_sess_4e',
    lastCustomerMsgTime: Date.now() - 5000,
  };
  // 2026-10-28T12:00:00Z in unix seconds is 1793188800
  const msg4e = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Bob' }, wa_id: phone4 }],
    messages: [{ from: phone4, id: 'wamid.4e', type: 'text', text: { body: '1793188800' } }]
  };
  const res4e = (await runner4e.executeNode(msg4e))[0].json;
  assert(res4e.sessionStage === 'appt_confirm', 'Unix timestamp parsed into slot');

  // -------------------------------------------------------------
  // TEST 5: Idempotency & Rapid-fire Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Idempotency & Repeat Protection ---');
  const runner5 = createRunner();
  const phone5 = '919888877777';
  const msg5a = {
    messaging_product: 'whatsapp',
    contacts: [{ profile: { name: 'Dan' }, wa_id: phone5 }],
    messages: [{ from: phone5, id: 'wamid.dup_test_1', type: 'text', text: { body: 'Hello' } }]
  };
  const res5a = await runner5.executeNode(msg5a);
  assert(res5a.length === 1, 'First message processed');

  // Immediate retry of identical message ID (Meta webhook retry)
  const res5b = await runner5.executeNode(msg5a);
  assert(res5b.length === 0, 'Duplicate Meta message ID dropped silently');

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`========================================`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
