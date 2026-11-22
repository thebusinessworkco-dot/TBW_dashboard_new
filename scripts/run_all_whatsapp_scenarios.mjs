// Full test suite for 16 WhatsApp scenarios
import { executeWhatsAppRouter } from './test_whatsapp_fix_complete.mjs';

function createMetaMessage({ phone = '919876543210', text = '', choiceId = '', choiceTitle = '', profileName = 'Rahul Sharma', msgId = `wamid_${Date.now()}_${Math.random()}` } = {}) {
  const json = {
    contacts: [{ profile: { name: profileName }, wa_id: phone }],
    messages: []
  };

  if (choiceId) {
    json.messages.push({
      from: phone,
      id: msgId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'interactive',
      interactive: {
        button_reply: { id: choiceId, title: choiceTitle || choiceId }
      }
    });
  } else {
    json.messages.push({
      from: phone,
      id: msgId,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'text',
      text: { body: text }
    });
  }

  return json;
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${details}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING THE BUSINESS WORK WHATSAPP AUTOMATION COMPLETE TEST SUITE');
  console.log('================================================================\n');

  const sharedMem = {};
  const phone = '919876543210';
  let t = Date.now();

  // Test 1: New customer sends Hello
  const out1 = executeWhatsAppRouter(createMetaMessage({ text: 'Hello', profileName: 'Rahul Sharma', msgId: 'msg_001' }), sharedMem, t);
  assert(out1.length === 1, '1. New customer sends Hello: returns 1 output item');
  assert(out1[0].json.waPayload.type === 'interactive', '1. Hello reply is interactive with buttons');
  assert(out1[0].json.reply.includes('Welcome to The Business Work'), '1. Hello reply contains welcome text');
  assert(out1[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_intent_appointment'), '1. Has Book Appointment button');
  assert(out1[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_intent_service'), '1. Has Explore Services button');

  // Test 2: Customer selects Book Appointment
  t += 5000;
  const out2 = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_intent_appointment', choiceTitle: 'Book Appointment', msgId: 'msg_002' }), sharedMem, t);
  assert(out2.length === 1, '2. Selects Book Appointment');
  assert(out2[0].json.reply.includes('Rahul Sharma') || out2[0].json.reply.includes('Rahul'), '2. Leverages Meta profile name');
  assert(out2[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_name_accept'), '2. Offers option to accept profile name');
  assert(out2[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_name_custom'), '2. Offers option to enter custom name');

  // Test 3: Customer confirms name
  t += 5000;
  const out3 = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_name_accept', choiceTitle: 'Yes, call me Rahul', msgId: 'msg_003' }), sharedMem, t);
  assert(out3[0].json.reply.includes('What is your business or company name?'), '3. Asks business name after name confirmation');
  assert(sharedMem.customers[phone].name === 'Rahul Sharma', '3. Customer name stored as Rahul Sharma');

  // Test 4: Customer provides business name
  t += 5000;
  const out4 = executeWhatsAppRouter(createMetaMessage({ text: 'Sharma Logistics', msgId: 'msg_004' }), sharedMem, t);
  assert(out4[0].json.reply.includes('What would you like help with?'), '4. Asks what service they want help with');
  assert(out4[0].json.waPayload.interactive.action.button === 'Explore Services', '4. Shows category list for service selection');
  assert(sharedMem.customers[phone].business === 'Sharma Logistics', '4. Business name stored as Sharma Logistics');

  // Test 5: Customer selects category and sub-service
  t += 5000;
  const out5a = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_cat_whatsapp', choiceTitle: 'WhatsApp & Social Auto', msgId: 'msg_005a' }), sharedMem, t);
  assert(out5a[0].json.reply.includes('WhatsApp & Social'), '5a. Category selected shows subservices');
  assert(out5a[0].json.waPayload.interactive.type === 'list', '5a. Subservices presented in interactive list');

  t += 5000;
  const out5b = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_svc_wa_business', choiceTitle: 'WhatsApp Business Automation', msgId: 'msg_005b' }), sharedMem, t);
  assert(out5b[0].json.reply.includes('WhatsApp Business Automation'), '5b. Shows service explanation');
  assert(out5b[0].json.reply.includes('Example:'), '5b. Shows concrete real-world example');
  assert(out5b[0].json.reply.includes('?'), '5b. Asks 1 relevant business question');
  assert(out5b[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_book_for_service'), '5b. Has Book Consultation button');

  // Test 6: Customer clicks Book Consultation for selected service
  t += 5000;
  const out6 = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_book_for_service', choiceTitle: 'Book Consultation', msgId: 'msg_006' }), sharedMem, t);
  assert(out6[0].json.waPayload.interactive.action.button === 'Choose Date', '6. Proceeds directly to date picker with service remembered');
  assert(sharedMem.customers[phone].serviceDetail === 'WhatsApp Business Automation', '6. Service preserved as WhatsApp Business Automation');

  // Test 7: Customer picks an available date (pick tomorrow's date to test future slot)
  t += 5000;
  const chosenDate = out6[0].json.waPayload.interactive.action.sections[0].rows[1].id;
  const out7 = executeWhatsAppRouter(createMetaMessage({ choiceId: chosenDate, msgId: 'msg_007' }), sharedMem, t);
  assert(out7[0].json.action === 'check_day', '7. Triggers action = check_day for Google Calendar');
  assert(out7[0].json.calendarStart.includes('T10:00:00+05:30'), '7. Queries business hours 10:00 AM IST');
  assert(out7[0].json.calendarEnd.includes('T22:00:00+05:30'), '7. Queries business hours 10:00 PM IST');

  // Test 8: Slot selection and Confirmation
  t += 5000;
  const slotDateStr = chosenDate.slice(9).replace(/-/g, '');
  const slotId = `tbw_slot_${slotDateStr}_1100`;
  const out8 = executeWhatsAppRouter(createMetaMessage({ choiceId: slotId, msgId: 'msg_008' }), sharedMem, t);
  assert(out8[0].json.sessionStage === 'appt_confirm', '8. Slot selection advances to appt_confirm');
  assert(out8[0].json.reply.includes('Please confirm your 30-minute consultation'), '8. Displays confirmation summary');
  assert(out8[0].json.reply.includes('Sharma Logistics'), '8. Summary includes business name');
  assert(out8[0].json.reply.includes('WhatsApp Business Automation'), '8. Summary includes chosen service');
  assert(out8[0].json.waPayload.interactive.action.buttons.some(b => b.reply.id === 'tbw_appt_confirm'), '8. Has Confirm Booking button');

  // Test 9: Confirm Booking Clicked
  t += 5000;
  const out9 = executeWhatsAppRouter(createMetaMessage({ choiceId: 'tbw_appt_confirm', msgId: 'msg_009' }), sharedMem, t);
  assert(out9[0].json.action === 'book', '9. Confirm booking triggers action = book');
  assert(out9[0].json.bookingEventId.startsWith('tb'), '9. Generates deterministic booking hash ID');

  // Simulate successful booking callback
  sharedMem.customers[phone].activeBooking = {
    apptStart: out8[0].json.apptStart,
    service: 'WhatsApp Business Automation',
    eventId: out9[0].json.bookingEventId,
  };
  sharedMem.customers[phone].stage = 'booked';
  sharedMem.confirmedBookingKeys[`${phone}|${out8[0].json.apptStart}`] = true;

  // Test 10: Customer says "Thank you!" after booking (DO NOT RESET TO WELCOME MESSAGE)
  t += 5000;
  const out10 = executeWhatsAppRouter(createMetaMessage({ text: 'Thank you so much!', msgId: 'msg_010' }), sharedMem, t);
  assert(out10.length === 1, '10. Responds to polite thank you');
  assert(!out10[0].json.reply.includes('Welcome to The Business Work'), '10. DOES NOT repeat welcome message');
  assert(out10[0].json.reply.includes('welcome'), '10. Responds warmly with "You\'re very welcome"');

  // Test 11: Customer returns 2 hours later and sends "Hi"
  t += 2 * 3600 * 1000; // +2 hours
  const out11 = executeWhatsAppRouter(createMetaMessage({ text: 'Hi', msgId: 'msg_011' }), sharedMem, t);
  assert(out11.length === 1, '11. Returns 2 hours later: handled gracefully');
  assert(out11[0].json.reply.includes('Rahul'), '11. Remembers customer name Rahul');
  assert(out11[0].json.reply.includes('upcoming appointment'), '11. Acknowledges upcoming appointment');

  // Test 12: Customer attempts duplicate booking on same slot
  t += 5000;
  const out12 = executeWhatsAppRouter(createMetaMessage({ choiceId: slotId, msgId: 'msg_012' }), sharedMem, t);
  assert(out12[0].json.reply.includes('unavailable') || out12[0].json.reply.includes('passed'), '12. Blocks double booking of already booked slot');

  // Test 13: Deduplication of Webhook Retries (Same msgId)
  const out13 = executeWhatsAppRouter(createMetaMessage({ choiceId: slotId, msgId: 'msg_012' }), sharedMem, t);
  assert(out13.length === 0, '13. Duplicate webhook message ID completely dropped (idempotent)');

  // Test 14: Rapid-fire duplicate messages within 1 second
  const out14a = executeWhatsAppRouter(createMetaMessage({ text: 'Price please', msgId: 'msg_014a' }), sharedMem, t);
  const out14b = executeWhatsAppRouter(createMetaMessage({ text: 'Price please', msgId: 'msg_014b' }), sharedMem, t + 200);
  assert(out14a.length === 1, '14. First rapid-fire message processed');
  assert(out14b.length === 0, '14. Second identical message within 200ms suppressed');

  // Test 15: Customer requests Human Representative
  t += 5000;
  const out15 = executeWhatsAppRouter(createMetaMessage({ text: 'Can I speak to a human representative?', msgId: 'msg_015' }), sharedMem, t);
  assert(out15[0].json.sessionStage === 'human_requested', '15. Sets stage to human_requested');
  assert(out15[0].json.reply.includes('notified our team'), '15. Confirms team notification');

  // Test 16: Explore Services from New Customer (ZERO Interrogation)
  const phone2 = '919999888877';
  const newMem = {};
  const out16 = executeWhatsAppRouter(createMetaMessage({ phone: phone2, choiceId: 'tbw_intent_service', profileName: 'Pooja Verma', msgId: 'msg_016' }), newMem, t);
  assert(out16.length === 1, '16. New customer clicks Explore Services');
  assert(out16[0].json.waPayload.interactive.action.button === 'Explore Services', '16. Immediately shows 4 categories without asking name or language!');
  assert(out16[0].json.waPayload.interactive.action.sections[0].rows.length === 4, '16. Shows exactly 4 core categories');
  assert(!out16[0].json.reply.includes('What is your name'), '16. Never asks name before showing services');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
