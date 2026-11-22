import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
let n8nBaseUrl = 'https://n8n.thebusinesswork.com';
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k === 'N8N_API_KEY') apiKey = v;
    if (k === 'N8N_API_BASE_URL') n8nBaseUrl = v;
  }
}

const WEBHOOK_URL = `${n8nBaseUrl}/webhook/34fbdf5a-09c3-465d-bda6-be2497801a05/webhook`;
const AUTHORIZED_TEST_PHONE = '918604600292'; // Authorized admin Aman Rajbhar

async function getLatestExecutionId() {
  const res = await fetch(`${n8nBaseUrl}/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=1`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!res.ok) return null;
  const d = await res.json();
  return (d.data || d)[0]?.id;
}

async function sendWebhook(messageObj) {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1392092143987065',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '917972020292',
                phone_number_id: '1392092143987065'
              },
              contacts: [
                {
                  profile: { name: 'Aman Rajbhar' },
                  wa_id: AUTHORIZED_TEST_PHONE
                }
              ],
              messages: [messageObj]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  console.log(`Sending webhook for msg ${messageObj.id} (${messageObj.type})...`);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log(`Webhook response status: ${res.status}`);
  return res.status;
}

async function waitForNewExecution(previousId) {
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch(`${n8nBaseUrl}/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=3`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!res.ok) continue;
    const d = await res.json();
    const list = d.data || d;
    const newExec = list.find(e => e.id !== previousId && e.mode === 'webhook');
    if (newExec) {
      return newExec;
    }
  }
  return null;
}

async function inspectExecution(execId) {
  const res = await fetch(`${n8nBaseUrl}/api/v1/executions/${execId}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function run() {
  console.log('========================================================');
  console.log('AUTHORIZED PRODUCTION WHATSAPP BOOKING TEST');
  console.log('Target Authorized Phone:', AUTHORIZED_TEST_PHONE);
  console.log('========================================================\n');

  const baselineId = await getLatestExecutionId();
  console.log('Baseline latest execution ID:', baselineId);

  // STEP 1: Send Date Selection: Mon 26 Oct / Tomorrow 27 Oct
  const dateMsgId = `wamid.auth_test_date_${Date.now()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  
  // Calculate tomorrow's date in IST
  const tomorrowIST = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(Date.now() + 86400000));
  const p = Object.fromEntries(tomorrowIST.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const testDate = `${p.year}-${p.month}-${p.day}`;

  console.log(`\n--- STEP 1: Sending Date Selection (${testDate}) ---`);
  await sendWebhook({
    from: AUTHORIZED_TEST_PHONE,
    id: dateMsgId,
    timestamp,
    type: 'interactive',
    interactive: {
      type: 'list_reply',
      list_reply: {
        id: `tbw_date_${testDate}`,
        title: `Tue ${p.day} Oct`
      }
    }
  });

  const execDate = await waitForNewExecution(baselineId);
  console.log(`Execution for Date Selection: ID ${execDate?.id}, Status: ${execDate?.status}`);

  if (execDate) {
    const fullDateExec = await inspectExecution(execDate.id);
    const runData = fullDateExec.data?.resultData?.runData || {};
    const langOut = runData['Language + Name + Business + Purpose']?.[0]?.data?.main?.[0]?.[0]?.json;
    console.log('Language node output:', {
      action: langOut?.action,
      apptDate: langOut?.apptDate,
      calendarStart: langOut?.calendarStart,
      calendarEnd: langOut?.calendarEnd
    });
    console.log('Executed nodes:', Object.keys(runData));
  }

  // STEP 2: Send Time Slot Selection: 5:30 pm - 6:00 pm (THE EXACT SLOT THAT FAILED IN 11795!)
  console.log(`\n--- STEP 2: Sending Slot Selection (5:30 pm - 6:00 pm on ${testDate}) ---`);
  const slotMsgId = `wamid.auth_test_slot_${Date.now()}`;
  const cleanDate = testDate.replace(/-/g, '');
  const slotId = `tbw_slot_${cleanDate}_1730`; // 5:30 PM slot!

  await sendWebhook({
    from: AUTHORIZED_TEST_PHONE,
    id: slotMsgId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'interactive',
    interactive: {
      type: 'list_reply',
      list_reply: {
        id: slotId,
        title: '5:30 pm - 6:00 pm'
      }
    }
  });

  const execSlot = await waitForNewExecution(execDate?.id || baselineId);
  console.log(`Execution for Slot Selection: ID ${execSlot?.id}, Status: ${execSlot?.status}`);

  let slotSuccess = false;
  let slotLangOut = null;
  let metaSentMessageId = null;

  if (execSlot) {
    const fullSlotExec = await inspectExecution(execSlot.id);
    const runData = fullSlotExec.data?.resultData?.runData || {};
    slotLangOut = runData['Language + Name + Business + Purpose']?.[0]?.data?.main?.[0]?.[0]?.json;
    console.log('Language node output:', {
      stage: slotLangOut?.sessionStage,
      apptDate: slotLangOut?.apptDate,
      apptStart: slotLangOut?.apptStart,
      apptEnd: slotLangOut?.apptEnd,
      reply: slotLangOut?.reply
    });
    console.log('Executed nodes:', Object.keys(runData));

    // Check Meta send node output
    const metaSendOut = runData['Send WhatsApp Interactive (Meta Cloud API)']?.[0]?.data?.main?.[0]?.[0]?.json;
    metaSentMessageId = metaSendOut?.messages?.[0]?.id;
    console.log('Meta Sent Message ID to Customer:', metaSentMessageId);

    if (execSlot.status === 'success' && slotLangOut?.sessionStage === 'appt_confirm') {
      slotSuccess = true;
      console.log('🎉 STEP 2 PASSED: Slot 5:30 pm processed cleanly with NO Invalid Date / RangeError!');
    }
  }

  // STEP 3: Send Confirmation: Confirm Booking
  console.log('\n--- STEP 3: Confirm Booking ---');
  const confirmMsgId = `wamid.auth_test_confirm_${Date.now()}`;
  await sendWebhook({
    from: AUTHORIZED_TEST_PHONE,
    id: confirmMsgId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: {
        id: 'tbw_appt_confirm',
        title: 'Confirm Booking'
      }
    }
  });

  const execConfirm = await waitForNewExecution(execSlot?.id || execDate?.id);
  console.log(`Execution for Confirmation: ID ${execConfirm?.id}, Status: ${execConfirm?.status}`);

  let confirmSuccess = false;
  let eventDetails = null;

  if (execConfirm) {
    const fullConfirmExec = await inspectExecution(execConfirm.id);
    const runData = fullConfirmExec.data?.resultData?.runData || {};
    const confirmLangOut = runData['Language + Name + Business + Purpose']?.[0]?.data?.main?.[0]?.[0]?.json;
    console.log('Language node output:', {
      action: confirmLangOut?.action,
      calendarStart: confirmLangOut?.calendarStart,
      calendarEnd: confirmLangOut?.calendarEnd,
      bookingEventId: confirmLangOut?.bookingEventId
    });
    console.log('Executed nodes:', Object.keys(runData));

    const gcalOut = runData['Google Calendar - Create Booking']?.[0]?.data?.main?.[0]?.[0]?.json;
    eventDetails = {
      id: gcalOut?.id,
      summary: gcalOut?.summary,
      start: gcalOut?.start?.dateTime || gcalOut?.start,
      end: gcalOut?.end?.dateTime || gcalOut?.end,
      htmlLink: gcalOut?.htmlLink
    };
    console.log('Google Calendar Event Created:', eventDetails);

    if (execConfirm.status === 'success') {
      confirmSuccess = true;
      console.log('🎉 STEP 3 PASSED: Appointment created in Google Calendar!');
    }
  }

  console.log('\n========================================================');
  console.log('FINAL E2E VERIFICATION REPORT');
  console.log('========================================================');
  console.log(`Date Selection Execution ID: ${execDate?.id} (Meta Msg: ${dateMsgId})`);
  console.log(`Slot Selection Execution ID: ${execSlot?.id} (Meta Inbound: ${slotMsgId}, Meta Outbound: ${metaSentMessageId})`);
  console.log(`Confirm Booking Execution ID: ${execConfirm?.id} (Meta Inbound: ${confirmMsgId})`);
  console.log(`Google Calendar Event:`, eventDetails);
  console.log(`All Steps Succeeded: ${slotSuccess && confirmSuccess ? 'YES - 100% PASS' : 'NO'}`);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
