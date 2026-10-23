// ==============================================================================
// TEST SUITE: HUMAN TAKEOVER SAFETY & MODE API VERIFICATION
// ==============================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local for local testing
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  process.env.N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'test_secret_998877';
  const { GET: modeGet } = await import('../src/app/api/webhook/n8n/mode/[phone]/route.ts');
  const { POST: messagePost } = await import('../src/app/api/webhook/n8n/message/route.ts');
  const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
  const supabase = createAdminClient();

  const testPhone = '+919988776655';
  const cleanPhone = '9988776655';

  console.log('\n--- 1. Testing Mode API Authentication & Security Guard ---');

  // Test 1.1: Unauthorized request without headers
  const unauthReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
  });
  const unauthRes = await modeGet(unauthReq, { params: Promise.resolve({ phone: cleanPhone }) });
  const unauthData = await unauthRes.json();
  assert(unauthRes.status === 401, 'Request without auth rejected with HTTP 401');
  assert(unauthData.data?.mode === 'human', 'Unauthorized response defaults to human mode (fail-closed)');
  assert(unauthData.data?.can_respond === false, 'can_respond is false on 401');

  // Test 1.2: Authorized request via X-N8N-API-KEY header
  const authHeaderReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
    headers: {
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
  });
  const authHeaderRes = await modeGet(authHeaderReq, { params: Promise.resolve({ phone: cleanPhone }) });
  const authHeaderData = await authHeaderRes.json();
  assert(authHeaderRes.status === 200, 'Authorized request with X-N8N-API-KEY accepted with HTTP 200');
  assert(authHeaderData.success === true, 'Response marked success: true');

  // Test 1.3: Authorized request via Authorization: Bearer header
  const authBearerReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
  });
  const authBearerRes = await modeGet(authBearerReq, { params: Promise.resolve({ phone: cleanPhone }) });
  assert(authBearerRes.status === 200, 'Authorized request with Bearer token accepted with HTTP 200');

  console.log('\n--- 2. Testing AI Mode vs Human Takeover Mode States ---');

  // Set up test contact and conversation
  let testContactId = null;
  let testConvId = null;
  if (supabase) {
    const { data: newContact } = await supabase
      .from('admin_contacts')
      .insert({
        name: 'Takeover Test User',
        phone: testPhone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_demo: false,
      })
      .select('id')
      .single();
    testContactId = newContact?.id;

    if (testContactId) {
      const { data: newConv } = await supabase
        .from('admin_conversations')
        .insert({
          contact_id: testContactId,
          platform: 'whatsapp',
          status: 'open',
          last_message: 'Testing takeover',
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          manual_takeover: false,
          automation_paused: false,
          is_demo: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      testConvId = newConv?.id;
    }
  }

  // Test 2.1: Default AI Mode (Takeover inactive)
  const aiModeReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
    headers: { 'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET },
  });
  const aiModeRes = await modeGet(aiModeReq, { params: Promise.resolve({ phone: cleanPhone }) });
  const aiModeData = await aiModeRes.json();
  assert(aiModeRes.status === 200, 'AI mode query returned 200');
  assert(aiModeData.data?.mode === 'ai', 'data.mode confirms "ai"');
  assert(aiModeData.data?.can_respond === true, 'data.can_respond is true');
  assert(aiModeData.data?.manual_takeover === false, 'data.manual_takeover is false');

  // Test 2.2: Human Takeover Mode (manual_takeover = true)
  if (supabase && testConvId) {
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: true, updated_at: new Date().toISOString() })
      .eq('id', testConvId);
  }

  const humanModeReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
    headers: { 'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET },
  });
  const humanModeRes = await modeGet(humanModeReq, { params: Promise.resolve({ phone: cleanPhone }) });
  const humanModeData = await humanModeRes.json();
  assert(humanModeRes.status === 200, 'Human mode query returned 200');
  assert(humanModeData.data?.mode === 'human', 'data.mode confirms "human" during manual takeover');
  assert(humanModeData.data?.can_respond === false, 'data.can_respond is false during manual takeover');
  assert(humanModeData.data?.manual_takeover === true, 'data.manual_takeover is true');

  // Test 2.3: Automation Paused Mode (automation_paused = true, manual_takeover = false)
  if (supabase && testConvId) {
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: false, automation_paused: true, updated_at: new Date().toISOString() })
      .eq('id', testConvId);
  }

  const pausedModeReq = new Request(`http://localhost/api/webhook/n8n/mode/${cleanPhone}`, {
    method: 'GET',
    headers: { 'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET },
  });
  const pausedModeRes = await modeGet(pausedModeReq, { params: Promise.resolve({ phone: cleanPhone }) });
  const pausedModeData = await pausedModeRes.json();
  assert(pausedModeData.data?.mode === 'human', 'data.mode confirms "human" when automation paused');
  assert(pausedModeData.data?.can_respond === false, 'data.can_respond is false when automation paused');

  console.log('\n--- 3. Testing Inbound Logging Preservation During Takeover ---');

  // Test 3.1: Inbound message via /api/webhook/n8n/message is saved even when manual_takeover is active
  if (supabase && testConvId) {
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: true, automation_paused: false, updated_at: new Date().toISOString() })
      .eq('id', testConvId);
  }

  const inboundMsgReq = new Request('http://localhost/api/webhook/n8n/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      phone_number: testPhone,
      contact_name: 'Takeover Test User',
      direction: 'inbound',
      sender_type: 'customer',
      content: 'Hello human agent, I need urgent assistance!',
      wa_message_id: `wamid.TAKEOVER_${Date.now()}`,
    }),
  });

  const inboundMsgRes = await messagePost(inboundMsgReq);
  const inboundMsgData = await inboundMsgRes.json();
  assert(inboundMsgRes.status === 200, 'Inbound message logged with HTTP 200 during active takeover');
  assert(inboundMsgData.success === true, 'Inbound message logging success is true');
  assert(inboundMsgData.can_respond === false, 'Inbound response correctly warns can_respond: false');
  assert(inboundMsgData.manual_takeover === true, 'Inbound response flags manual_takeover: true');

  // Verify message is saved in Supabase
  if (supabase && testConvId) {
    const { data: savedMsg } = await supabase
      .from('admin_messages')
      .select('id, content')
      .eq('conversation_id', testConvId)
      .eq('content', 'Hello human agent, I need urgent assistance!')
      .maybeSingle();

    assert(savedMsg !== null, 'Customer message successfully persisted to database during takeover');
  }

  console.log('\n--- 4. Testing n8n Condition Logic (Fail-Open vs Fail-Closed) ---');

  // Test 4.1: Buggy Old Condition: leftValue = $json.data?.mode || 'ai', rightValue = 'human', notEquals
  function evaluateOldCondition(apiOutput) {
    const mode = apiOutput.data?.mode || 'ai';
    return mode !== 'human'; // Returns true if bot should reply
  }

  // Test 4.2: Safe New Condition: leftValue = $json.data?.mode, rightValue = 'ai', equals
  function evaluateSafeCondition(apiOutput) {
    return apiOutput.data?.mode === 'ai'; // Returns true ONLY if explicitly confirmed 'ai'
  }

  const normalAiResponse = { success: true, data: { mode: 'ai' } };
  const humanTakeoverResponse = { success: true, data: { mode: 'human' } };
  const apiFailedResponse = { error: '500 Internal Server Error' }; // or undefined/404
  const emptyResponse = {};

  // Verify normal AI mode
  assert(evaluateOldCondition(normalAiResponse) === true, 'Old logic allows AI on valid AI response');
  assert(evaluateSafeCondition(normalAiResponse) === true, 'Safe logic allows AI on valid AI response');

  // Verify human takeover
  assert(evaluateOldCondition(humanTakeoverResponse) === false, 'Old logic blocks AI on human takeover');
  assert(evaluateSafeCondition(humanTakeoverResponse) === false, 'Safe logic blocks AI on human takeover');

  // CRITICAL FAIL-OPEN VS FAIL-CLOSED VERIFICATION:
  assert(
    evaluateOldCondition(apiFailedResponse) === true,
    'DANGER CONFIRMED: Old logic failed OPEN (allowed bot reply when API failed!)'
  );
  assert(
    evaluateSafeCondition(apiFailedResponse) === false,
    'SAFETY CONFIRMED: Safe logic fails CLOSED (blocks bot reply when API fails!)'
  );

  assert(
    evaluateOldCondition(emptyResponse) === true,
    'DANGER CONFIRMED: Old logic allowed bot reply on empty/404 response'
  );
  assert(
    evaluateSafeCondition(emptyResponse) === false,
    'SAFETY CONFIRMED: Safe logic blocks bot reply on empty/404 response'
  );

  console.log('\n--- 5. Testing Session-State Protection During Human Takeover ---');

  // Simulate in-memory staticData session state
  const mockStaticData = {
    sessions: {
      [cleanPhone]: {
        stage: 'appt_name',
        name: 'Original Lead Name',
        apptDate: '2026-10-25',
        history: ['Bot: What is your name?'],
      },
    },
  };

  // Human Takeover active: Admin is manually chatting with the customer.
  // Customer types: "Please connect me to an agent, my phone is dying."
  const incomingCustomerText = 'Please connect me to an agent, my phone is dying.';

  // Flawed flow: Node runs BEFORE checking mode -> corrupts session state
  function runFlawedFlow(sessionStore, text) {
    const s = sessionStore.sessions[cleanPhone];
    // In appt_name stage, customer's text is mistakenly saved as customer's name!
    s.name = text.slice(0, 100);
    s.stage = 'appt_date';
  }

  // Safe flow: Mode is checked FIRST. If mode !== 'ai', session mutation is completely bypassed!
  function runSafeFlow(modeResponse, sessionStore, text) {
    if (modeResponse.data?.mode !== 'ai') {
      // Human takeover: DO NOT TOUCH SESSION STATE!
      return;
    }
    const s = sessionStore.sessions[cleanPhone];
    s.name = text.slice(0, 100);
    s.stage = 'appt_date';
  }

  // Test flawed flow behavior
  const flawedStore = JSON.parse(JSON.stringify(mockStaticData));
  runFlawedFlow(flawedStore, incomingCustomerText);
  assert(
    flawedStore.sessions[cleanPhone].name === incomingCustomerText,
    'DANGER CONFIRMED: Flawed flow corrupted customer name in session state during human chat'
  );
  assert(
    flawedStore.sessions[cleanPhone].stage === 'appt_date',
    'DANGER CONFIRMED: Flawed flow advanced bot stage from appt_name to appt_date during human chat'
  );

  // Test safe flow behavior under human takeover
  const safeStore = JSON.parse(JSON.stringify(mockStaticData));
  runSafeFlow({ success: true, data: { mode: 'human', can_respond: false } }, safeStore, incomingCustomerText);
  assert(
    safeStore.sessions[cleanPhone].name === 'Original Lead Name',
    'SAFETY CONFIRMED: Safe flow preserved customer name untouched during human takeover'
  );
  assert(
    safeStore.sessions[cleanPhone].stage === 'appt_name',
    'SAFETY CONFIRMED: Safe flow prevented bot stage advancement during human takeover'
  );

  // Test safe flow behavior under API failure (fail-closed)
  runSafeFlow({ error: 'Timeout' }, safeStore, incomingCustomerText);
  assert(
    safeStore.sessions[cleanPhone].name === 'Original Lead Name',
    'SAFETY CONFIRMED: Safe flow preserved session state on API failure (fail-closed)'
  );
  assert(
    safeStore.sessions[cleanPhone].stage === 'appt_name',
    'SAFETY CONFIRMED: Safe flow prevented bot stage advancement on API failure'
  );

  // Clean up test data
  if (supabase && testContactId) {
    if (testConvId) {
      await supabase.from('admin_messages').delete().eq('conversation_id', testConvId);
      await supabase.from('admin_conversations').delete().eq('id', testConvId);
    }
    await supabase.from('admin_contacts').delete().eq('id', testContactId);
    console.log('✓ Cleaned up all takeover test records from Supabase');
  }

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
