import fs from 'fs';
import vm from 'vm';

const code = fs.readFileSync('backups/candidate_Language_Name_Business_Purpose_code_v3.js', 'utf8');

function runTest(desc, { inputJson, staticData, expectedStage, expectedMenu, expectedTextContains, expectedButtonIds, expectedLang }) {
  const mem = staticData || {};
  const $json = inputJson;

  const sandbox = {
    $input: {
      first: () => ({ json: $json }),
      all: () => [{ json: $json }],
      item: { json: $json }
    },
    $getWorkflowStaticData: (type) => mem,
    console: { log: () => {}, error: console.error, warn: console.warn },
    Date: Date,
    Math: Math,
    Intl: Intl,
    RegExp: RegExp,
    Array: Array,
    Object: Object,
    String: String,
    Boolean: Boolean,
    Number: Number
  };

  const script = new vm.Script(`(function() {\n${code}\n})()`);
  const context = vm.createContext(sandbox);
  const result = script.runInContext(context);

  if (!result || !result.length) {
    throw new Error(`[${desc}] No result returned!`);
  }
  const out = result[0].json;

  console.log(`\n--- TEST: ${desc} ---`);
  console.log(`Out Stage: ${out.sessionStage}, Out Action: ${out.action}`);
  const payloadButtons = out.waPayload?.interactive?.action?.buttons;
  if (payloadButtons) {
    console.log(`Buttons: ${JSON.stringify(payloadButtons.map(b => b.reply.id))}`);
  }

  if (expectedStage && out.sessionStage !== expectedStage) {
    throw new Error(`[${desc}] Expected stage '${expectedStage}', got '${out.sessionStage}'`);
  }
  if (expectedLang && out.selectedLanguage !== expectedLang) {
    throw new Error(`[${desc}] Expected lang '${expectedLang}', got '${out.selectedLanguage}'`);
  }
  if (expectedTextContains) {
    const text = out.reply || out.waPayload?.interactive?.body?.text || '';
    if (!text.includes(expectedTextContains)) {
      throw new Error(`[${desc}] Expected text to contain '${expectedTextContains}', got '${text}'`);
    }
  }
  if (expectedButtonIds) {
    const buttons = out.waPayload?.interactive?.action?.buttons?.map(b => b.reply.id) || [];
    for (const bId of expectedButtonIds) {
      if (!buttons.includes(bId)) {
        throw new Error(`[${desc}] Expected button '${bId}', buttons are: ${JSON.stringify(buttons)}`);
      }
    }
  }

  console.log(`✅ PASSED: ${desc}`);
  return { out, mem };
}

// 1. New message from brand new customer -> MUST ask language first
const test1 = runTest('1. New customer message asks for language first', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'text',
      text: { body: 'Hello' },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: {},
  expectedStage: 'awaiting_language',
  expectedTextContains: 'Which language would you prefer?'
});

// 2. Customer selects Hindi -> Language must be 'hi', returns main menu with End Chat button
const test2 = runTest('2. Customer selects Hindi -> language is hi, main menu has tbw_end_chat', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'interactive',
      interactive: {
        type: 'list_reply',
        list_reply: { id: 'lang_hi', title: 'हिंदी' }
      },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test1.mem,
  expectedStage: 'idle',
  expectedLang: 'hi',
  expectedButtonIds: ['tbw_intent_appointment', 'tbw_intent_service', 'tbw_end_chat']
});

// 3. Customer navigates to book appointment (date selection)
const test3 = runTest('3. Customer clicks Book Appointment -> stage is appt_date', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'tbw_intent_appointment', title: 'अपॉइंटमेंट बुक करें' }
      },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test2.mem,
  expectedStage: 'appt_date',
  expectedMenu: 'date',
  expectedLang: 'hi'
});

// 4. While on appt_date, customer types "End" (the exact case from user screenshot!)
const test4 = runTest('4. Customer types "End" on appt_date -> asks confirmation with Yes/No Quick Replies', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'text',
      text: { body: 'End' },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test3.mem,
  expectedStage: 'confirm_end',
  expectedMenu: 'confirm_end',
  expectedLang: 'hi',
  expectedTextContains: 'क्या आप वाकई यह बातचीत समाप्त करना चाहते हैं?',
  expectedButtonIds: ['tbw_end_confirm', 'tbw_end_cancel']
});

// 5. Customer clicks "No, Continue" (tbw_end_cancel) -> resumes exactly where they were (appt_date)
const test5 = runTest('5. Customer cancels end chat -> resumes back to appt_date with Hindi prompt', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'tbw_end_cancel', title: 'नहीं, जारी रखें' }
      },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test4.mem,
  expectedStage: 'appt_date',
  expectedMenu: 'date',
  expectedLang: 'hi',
  expectedTextContains: 'बढ़िया! बातचीत जारी रखते हैं:'
});

// 6. Customer clicks End Chat button again and clicks "Yes, End Chat" (tbw_end_confirm)
const test6a = runTest('6a. Customer triggers End Chat again via tbw_end_chat button', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'tbw_end_chat', title: 'चैट बंद करें' }
      },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test5.mem,
  expectedStage: 'confirm_end',
  expectedMenu: 'confirm_end',
  expectedLang: 'hi'
});

const test6b = runTest('6b. Customer confirms End Chat -> closes session, warm farewell', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: { id: 'tbw_end_confirm', title: 'हाँ, चैट बंद करें' }
      },
      timestamp: String(Math.floor(Date.now() / 1000))
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test6a.mem,
  expectedStage: 'session_closed',
  expectedLang: 'hi',
  expectedTextContains: 'The Business Work से संपर्क करने के लिए धन्यवाद',
  expectedButtonIds: ['tbw_restart']
});

// 7. After session closed or 20 mins passed, customer sends ANY new message -> MUST ask language first!
const test7 = runTest('7. After session closed/timeout, new message asks language first!', {
  inputJson: {
    messages: [{
      from: '917821840347',
      type: 'text',
      text: { body: 'Hey I want website' },
      timestamp: String(Math.floor(Date.now() / 1000) + 1800) // 30 mins later
    }],
    contacts: [{ profile: { name: 'Aman' } }]
  },
  staticData: test6b.mem,
  expectedStage: 'awaiting_language',
  expectedTextContains: 'Which language would you like to continue in?'
});

console.log('\n🎉 ALL 7 SIMULATION TESTS PASSED WITH 100% SUCCESS!');
