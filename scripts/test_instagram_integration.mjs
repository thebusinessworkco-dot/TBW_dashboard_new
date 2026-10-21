// ==============================================================================
// TEST SUITE: INSTAGRAM INTEGRATION & WHATSAPP REGRESSION VERIFICATION (V2)
// Real Route Handler Execution with Live Database Checks
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
  console.log('\n--- 1. Testing /api/n8n/webhook Mandatory Authentication & Fail-Closed Guard ---');
  const { POST: n8nPost } = await import('../src/app/api/n8n/webhook/route.ts');

  // Test 1.1: When N8N_WEBHOOK_SECRET is missing, MUST return 500 (Fail-closed)
  const origSecret = process.env.N8N_WEBHOOK_SECRET;
  delete process.env.N8N_WEBHOOK_SECRET;
  delete process.env.N8N_API_KEY;

  const noEnvReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'check_takeover' }),
  });
  const noEnvRes = await n8nPost(noEnvReq);
  const noEnvData = await noEnvRes.json();
  assert(noEnvRes.status === 500, 'Rejects with 500 when N8N_WEBHOOK_SECRET is not configured in environment');
  assert(noEnvData.can_respond === false, 'can_respond is false when secret is missing');

  // Restore test secret
  process.env.N8N_WEBHOOK_SECRET = origSecret || 'test_secure_n8n_secret_998877';

  // Test 1.2: Unauthorized caller (no header)
  const unauthReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'check_takeover' }),
  });
  const unauthRes = await n8nPost(unauthReq);
  assert(unauthRes.status === 401, 'Unauthorized caller rejected with 401');

  // Test 1.3: Authorized caller via Bearer token
  const authReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'check_takeover',
      sender_id: '999999999_non_existent',
    }),
  });
  const authRes = await n8nPost(authReq);
  const authData = await authRes.json();
  assert(authRes.status === 200, 'Authorized caller accepted with 200');
  assert(authData.can_respond === true, 'Non-existent contact defaults to can_respond: true');

  console.log('\n--- 2. Testing Stable IGSID Enforcement & Concurrency Deduplication ---');
  // Test 2.1: Missing sender_id (attempting username-only identification) MUST be rejected with 400
  const usernameOnlyReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_instagram_message',
      username: 'mutable_username_test',
      content: 'Hello without IGSID',
    }),
  });
  const usernameOnlyRes = await n8nPost(usernameOnlyReq);
  const usernameOnlyData = await usernameOnlyRes.json();
  assert(usernameOnlyRes.status === 400, 'Rejected with 400 when sender_id (IGSID) is missing');
  assert(usernameOnlyData.error?.includes('sender_id'), 'Clear error requiring stable IGSID');

  // Test 2.2: Valid incoming Instagram message ingestion
  const testIgsid = `test_igsid_${Date.now()}`;
  const testMid = `mid.test.${Date.now()}`;
  const testText = 'Hello, inquiry regarding web development';

  const ingestReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      event_type: 'incoming_instagram_message',
      sender_id: testIgsid,
      username: 'test_client_ig',
      content: testText,
      external_message_id: testMid,
    }),
  });

  const ingestRes = await n8nPost(ingestReq);
  const ingestData = await ingestRes.json();
  assert(ingestRes.status === 200, 'Incoming message ingested with 200');
  assert(ingestData.success === true, 'Response marked success: true');
  assert(Boolean(ingestData.conversation_id), 'Conversation ID created/resolved');
  assert(ingestData.can_respond === true, 'New conversation allows automation (can_respond: true)');

  const conversationId = ingestData.conversation_id;

  // Test 2.3: Deduplication on duplicate Meta message ID
  const dupReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      event_type: 'incoming_instagram_message',
      sender_id: testIgsid,
      content: testText,
      external_message_id: testMid, // duplicate
    }),
  });
  const dupRes = await n8nPost(dupReq);
  const dupData = await dupRes.json();
  assert(dupData.deduplicated === true, 'Duplicate Meta message ID detected and deduplicated: true');
  assert(dupData.can_respond === false, 'Duplicate message prevents duplicate AI response');

  console.log('\n--- 3. Testing Human Takeover Enforcement & Pre-Send Guard ---');
  const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
  const supabase = createAdminClient();

  if (supabase && conversationId) {
    // Activate human takeover in database
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: true, automation_paused: true })
      .eq('id', conversationId);

    // Test 3.1: Check takeover returns can_respond: false
    const takeoverReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'check_takeover',
        conversation_id: conversationId,
      }),
    });
    const takeoverRes = await n8nPost(takeoverReq);
    const takeoverData = await takeoverRes.json();
    assert(takeoverData.can_respond === false, 'Active takeover returns can_respond: false');
    assert(takeoverData.manual_takeover === true, 'manual_takeover flag is true');

    // Test 3.2: Outbound AI reply logging rejected during takeover
    const aiLogReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'log_ai_reply',
        conversation_id: conversationId,
        content: 'This AI reply should be rejected because takeover is active',
        external_message_id: `ai_mid_${Date.now()}`,
      }),
    });
    const aiLogRes = await n8nPost(aiLogReq);
    const aiLogData = await aiLogRes.json();
    assert(aiLogRes.status === 409, 'AI reply rejected with HTTP 409 during active takeover');
    assert(aiLogData.rejected === true, 'rejected flag is true');

    // Clean up test data from Supabase
    await supabase.from('admin_messages').delete().eq('conversation_id', conversationId);
    await supabase.from('admin_conversations').delete().eq('id', conversationId);
    if (ingestData.contact_id) {
      await supabase.from('admin_contacts').delete().eq('id', ingestData.contact_id);
    }
    console.log('  ✓ Cleaned up isolated test data from Supabase');
  }

  console.log('\n--- 4. Testing /api/instagram/send Admin Authorization & Session Verification ---');
  const { POST: igSendPost } = await import('../src/app/api/instagram/send/route.ts');

  // Test 4.1: Unauthenticated caller without admin session or token MUST be rejected with 401
  const unauthSendReq = new Request('http://localhost/api/instagram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: 'test_user',
      content: 'Attempting unauthenticated send',
    }),
  });
  const unauthSendRes = await igSendPost(unauthSendReq);
  const unauthSendData = await unauthSendRes.json();
  assert(unauthSendRes.status === 401, 'Unauthenticated caller rejected with 401');
  assert(unauthSendData.error?.includes('Unauthorized'), 'Clear authentication required message');

  // Test 4.2: Authorized caller checks credentials without fake simulation
  const authSendReq = new Request('http://localhost/api/instagram/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      recipient: 'test_user',
      content: 'Authorized test send',
    }),
  });
  const authSendRes = await igSendPost(authSendReq);
  const authSendData = await authSendRes.json();
  assert(authSendRes.status === 503, 'Returns 503 when Meta credentials missing (no fake simulation)');
  assert(authSendData.success === false, 'success is false');
  assert(!authSendData.messageId?.includes('simulated'), 'Zero fake simulated message IDs');

  console.log('\n--- 5. Testing WhatsApp Regression Protection ---');
  const { GET: waWebhookGet } = await import('../src/app/api/whatsapp/webhook/route.ts');

  // Test 5.1: Webhook verify challenge (GET)
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token_123';
  const waVerifyReq = new Request(
    'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test_verify_token_123&hub.challenge=test_challenge_code',
    { method: 'GET' }
  );
  const waVerifyRes = await waWebhookGet(waVerifyReq);
  const waVerifyText = await waVerifyRes.text();
  assert(waVerifyRes.status === 200, 'WhatsApp webhook GET verification returns 200');
  assert(waVerifyText === 'test_challenge_code', 'Returns exact hub.challenge');

  // Test 5.2: WhatsApp outgoing send credentials check
  const { POST: waSendPost } = await import('../src/app/api/whatsapp/send/route.ts');
  const waSendReq = new Request('http://localhost/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: '+919999999999',
      content: 'Hello WhatsApp',
    }),
  });
  const waSendRes = await waSendPost(waSendReq);
  const waSendData = await waSendRes.json();
  assert(waSendRes.status === 503, 'WhatsApp send returns 503 when credentials missing (no simulation)');
  assert(waSendData.success === false, 'success is false');

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner uncaught error:', err);
  process.exit(1);
});
