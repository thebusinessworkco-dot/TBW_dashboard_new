import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('backups/candidate_Language_Name_Business_Purpose_code_v2.js', 'utf8');

function runSimulation(inputJson, staticData = {}) {
  const sandbox = {
    $input: {
      first: () => ({ json: inputJson })
    },
    $getWorkflowStaticData: () => staticData,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    }
  };
  vm.createContext(sandbox);
  const wrapped = `(async () => {\n${code}\n})()`;
  return vm.runInContext(wrapped, sandbox);
}

async function testAll() {
  console.log('--- STARTING V2 SIMULATION SUITE ---');
  let passCount = 0;

  // Test 1: Slot selection returns encoded confirm button ID
  {
    const staticData = {
      customers: {
        '917821840347': {
          phone: '917821840347',
          language: 'en',
          apptDate: '2026-10-26',
          stage: 'appt_time'
        }
      }
    };
    const input = {
      messages: [{
        from: '917821840347',
        id: 'msg_slot_1',
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: 'tbw_slot_20261026_1830', title: '6:30 pm - 7:00 pm' }
        }
      }],
      contacts: [{ profile: { name: 'Test User' } }]
    };
    const res = await runSimulation(input, staticData);
    console.log('Test 1 raw result:', JSON.stringify(res, null, 2));
    const out = res[0].json;
    if (out.sessionStage !== 'appt_confirm') throw new Error(`Test 1 Failed: stage ${out.sessionStage}`);
    const btn = out.waPayload?.interactive?.action?.buttons?.[0]?.reply;
    if (btn?.id !== 'tbw_appt_confirm_20261026_1830') throw new Error(`Test 1 Failed: button id ${btn?.id}`);
    if (!staticData.lastSelectedSlot?.['917821840347']) throw new Error('Test 1 Failed: lastSelectedSlot missing');
    console.log('✅ Test 1 Passed: Slot selection encodes button ID correctly (' + btn.id + ')');
    passCount++;
  }

  // Test 2: Click confirm button with encoded slot when customer.apptStart is EMPTY in memory (simulating the race condition)
  {
    const staticData = {
      customers: {
        '917821840347': {
          phone: '917821840347',
          stage: 'appt_time',
          apptDate: '',
          apptStart: '', // empty due to concurrent execution!
          apptEnd: '',
          language: 'en'
        }
      }
    };
    const input = {
      messages: [{
        from: '917821840347',
        id: 'msg_confirm_1',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'tbw_appt_confirm_20261026_1830', title: 'Confirm Booking' }
        }
      }],
      contacts: [{ profile: { name: 'Test User' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    if (out.action !== 'book') throw new Error(`Test 2 Failed: action is ${out.action}, expected 'book'`);
    if (out.sessionStage !== 'appt_booking') throw new Error(`Test 2 Failed: stage is ${out.sessionStage}`);
    if (!out.apptStart) throw new Error('Test 2 Failed: apptStart is empty');
    console.log('✅ Test 2 Passed: Encoded confirm button recovers slot even with empty in-memory state!');
    passCount++;
  }

  // Test 3: Click legacy confirm button tbw_appt_confirm with slot in memory
  {
    const staticData = {
      customers: {
        '917821840347': {
          phone: '917821840347',
          stage: 'appt_confirm',
          apptDate: '2026-10-26',
          apptStart: '2026-10-26T13:00:00.000Z',
          apptEnd: '2026-10-26T13:30:00.000Z',
          language: 'en'
        }
      }
    };
    const input = {
      messages: [{
        from: '917821840347',
        id: 'msg_confirm_legacy',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'tbw_appt_confirm', title: 'Confirm Booking' }
        }
      }],
      contacts: [{ profile: { name: 'Test User' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    if (out.action !== 'book') throw new Error(`Test 3 Failed: action is ${out.action}`);
    console.log('✅ Test 3 Passed: Legacy tbw_appt_confirm with in-memory state books correctly');
    passCount++;
  }

  // Test 4: Click legacy confirm button with empty customer.apptStart but fallback in mem.lastActionValue
  {
    const staticData = {
      customers: {
        '917821840347': {
          phone: '917821840347',
          stage: 'appt_time',
          apptDate: '2026-10-26',
          apptStart: '',
          apptEnd: '',
          language: 'en'
        }
      },
      lastActionValue: {
        '917821840347': 'tbw_slot_20261026_1830'
      }
    };
    const input = {
      messages: [{
        from: '917821840347',
        id: 'msg_confirm_fallback',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'tbw_appt_confirm', title: 'Confirm Booking' }
        }
      }],
      contacts: [{ profile: { name: 'Test User' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    if (out.action !== 'book') throw new Error(`Test 4 Failed: action is ${out.action}`);
    console.log('✅ Test 4 Passed: Legacy confirm recovers slot from lastActionValue fallback');
    passCount++;
  }

  // Test 5: Admin alert generated on new customer
  {
    const staticData = { customers: {} };
    const input = {
      messages: [{
        from: '919876543210',
        id: 'msg_new_cust',
        type: 'text',
        text: { body: 'Hello I want automation' }
      }],
      contacts: [{ profile: { name: 'Rohit Sharma' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    const alert = out.adminAlertPayload;
    if (!alert) throw new Error('Test 5 Failed: adminAlertPayload is null');
    if (alert.to !== '918604600292') throw new Error(`Test 5 Failed: recipient is ${alert.to}`);
    if (!alert.text?.body?.includes('New Customer Alert')) throw new Error('Test 5 Failed: body missing New Customer Alert');
    console.log('✅ Test 5 Passed: Admin alert generated for new customer to 918604600292');
    passCount++;
  }

  // Test 6: Admin alert generated on returning customer
  {
    const staticData = {
      customers: {
        '919876543210': {
          phone: '919876543210',
          name: 'Rohit Sharma',
          lastCustomerMsgTime: Date.now() - 3600000, // 1 hour ago (inactive session)
          language: 'en'
        }
      }
    };
    const input = {
      messages: [{
        from: '919876543210',
        id: 'msg_returning_cust',
        type: 'text',
        text: { body: 'I need to check something' }
      }],
      contacts: [{ profile: { name: 'Rohit Sharma' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    const alert = out.adminAlertPayload;
    if (!alert) throw new Error('Test 6 Failed: adminAlertPayload is null');
    if (alert.to !== '918604600292') throw new Error(`Test 6 Failed: recipient is ${alert.to}`);
    if (!alert.text?.body?.includes('Returning Customer Alert')) throw new Error('Test 6 Failed: body missing Returning Customer Alert');
    console.log('✅ Test 6 Passed: Admin alert generated for returning customer to 918604600292');
    passCount++;
  }

  // Test 7: Admin alert generated on Talk to Human
  {
    const staticData = {
      customers: {
        '919876543210': {
          phone: '919876543210',
          name: 'Rohit Sharma',
          lastCustomerMsgTime: Date.now() - 5000,
          sessionId: 'sess_active',
          language: 'en',
          humanAlertSentForSession: false
        }
      }
    };
    const input = {
      messages: [{
        from: '919876543210',
        id: 'msg_human',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'tbw_talk_human', title: 'Talk to Human' }
        }
      }],
      contacts: [{ profile: { name: 'Rohit Sharma' } }]
    };
    const res = await runSimulation(input, staticData);
    const out = res[0].json;
    const alert = out.adminAlertPayload;
    if (!alert) throw new Error('Test 7 Failed: adminAlertPayload is null');
    if (alert.to !== '918604600292') throw new Error(`Test 7 Failed: recipient is ${alert.to}`);
    if (!alert.text?.body?.includes('Talk to Human Alert')) throw new Error('Test 7 Failed: body missing Talk to Human Alert');
    console.log('✅ Test 7 Passed: Admin alert generated for Talk to Human to 918604600292');
    passCount++;
  }

  console.log(`\n🎉 ALL ${passCount}/${passCount} SIMULATION TESTS PASSED PERFECTLY!`);
}

testAll().catch(err => {
  console.error('❌ SIMULATION ERROR:', err);
  process.exit(1);
});
