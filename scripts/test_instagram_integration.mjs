// ==============================================================================
// TEST SUITE: WHATSAPP INBOX INTEGRATION & INSTAGRAM REGRESSION VERIFICATION (V3)
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
  const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
  const supabase = createAdminClient();

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
      phone: '999999999999_non_existent',
    }),
  });
  const authRes = await n8nPost(authReq);
  const authData = await authRes.json();
  assert(authRes.status === 200, 'Authorized caller accepted with 200');
  assert(authData.can_respond === true, 'Non-existent contact defaults to can_respond: true');

  console.log('\n--- 2. Testing Incoming WhatsApp Ingestion & Normalized Phone Identification ---');
  // Test 2.1: Missing phone MUST be rejected with 400
  const noPhoneReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      customer_name: 'Test Name Only',
      content: 'Hello without phone',
    }),
  });
  const noPhoneRes = await n8nPost(noPhoneReq);
  const noPhoneData = await noPhoneRes.json();
  assert(noPhoneRes.status === 400, 'Rejected with 400 when phone number is missing');
  assert(noPhoneData.error?.includes('phone'), 'Clear error requiring stable phone/ID');

  // Test 2.2: Valid incoming WhatsApp message ingestion
  const testPhoneRaw = '91987654' + Math.floor(1000 + Math.random() * 9000);
  const testWamid = `wamid.HBgL.${Date.now()}`;
  const testText = 'Hello The Business Work, inquiry about automation services';

  const waIngestReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhoneRaw,
      customer_name: 'Rahul Sharma',
      content: testText,
      external_message_id: testWamid,
    }),
  });

  const waIngestRes = await n8nPost(waIngestReq);
  const waIngestData = await waIngestRes.json();
  assert(waIngestRes.status === 200, 'Incoming WhatsApp message ingested with 200');
  assert(waIngestData.success === true, 'Response marked success: true');
  assert(Boolean(waIngestData.conversation_id), 'WhatsApp conversation ID created/resolved');
  assert(waIngestData.can_respond === true, 'New conversation allows automation (can_respond: true)');

  const waConversationId = waIngestData.conversation_id;
  const waContactId = waIngestData.contact_id;

  // Test 2.3: Verify contact was created with normalized phone
  if (supabase && waContactId) {
    const { data: contactRow } = await supabase
      .from('admin_contacts')
      .select('phone, name')
      .eq('id', waContactId)
      .single();
    assert(contactRow?.phone === '+' + testPhoneRaw, 'Contact phone normalized with leading +');
    assert(contactRow?.name === 'Rahul Sharma', 'Contact name recorded from customer_name');

    // Test 2.4: Verify message sender_type and status
    const { data: msgRow } = await supabase
      .from('admin_messages')
      .select('sender_type, status, content')
      .eq('external_message_id', testWamid)
      .single();
    assert(msgRow?.sender_type === 'customer', 'Customer message has sender_type: customer');
    assert(msgRow?.status === 'sent', 'Customer message has status: sent (never fake delivered)');
  }

  // Test 2.5: Deduplication on duplicate wamid
  const dupWaReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-api-key': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhoneRaw,
      content: testText,
      external_message_id: testWamid, // duplicate wamid
    }),
  });
  const dupWaRes = await n8nPost(dupWaReq);
  const dupWaData = await dupWaRes.json();
  assert(dupWaData.deduplicated === true, 'Duplicate wamid detected and deduplicated: true');
  assert(dupWaData.can_respond === false, 'Duplicate message prevents duplicate AI response');

  // Test 2.6: Concurrent request deduplication with Promise.all
  const concurrentPhone = '91987655' + Math.floor(1000 + Math.random() * 9000);
  const concurrentWamid = `wamid.concurrent.${Date.now()}`;
  const concurrentPromises = Array.from({ length: 4 }).map(() => {
    const req = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'incoming_whatsapp_message',
        phone: concurrentPhone,
        customer_name: 'Concurrent User',
        content: 'Concurrent test message',
        external_message_id: concurrentWamid,
      }),
    });
    return n8nPost(req).then((r) => r.json());
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  const successfulIngests = concurrentResults.filter((r) => r.success && !r.deduplicated);
  const deduplicatedIngests = concurrentResults.filter((r) => r.success && r.deduplicated);
  assert(successfulIngests.length === 1, `Exactly 1 concurrent request succeeded as original (got ${successfulIngests.length})`);
  assert(deduplicatedIngests.length === 3, `Remaining 3 concurrent requests deduplicated cleanly (got ${deduplicatedIngests.length})`);
  assert(deduplicatedIngests.every((r) => r.can_respond === false), 'All deduplicated concurrent requests have can_respond: false');

  // Clean up all concurrent test contacts, conversations, and messages
  if (supabase) {
    const { data: testContacts } = await supabase
      .from('admin_contacts')
      .select('id')
      .or(`phone.eq.${concurrentPhone},phone.eq.+${concurrentPhone}`);

    if (testContacts && testContacts.length > 0) {
      const contactIds = testContacts.map((c) => c.id);
      const { data: testConvs } = await supabase
        .from('admin_conversations')
        .select('id')
        .in('contact_id', contactIds);

      if (testConvs && testConvs.length > 0) {
        const convIds = testConvs.map((cv) => cv.id);
        await supabase.from('admin_messages').delete().in('conversation_id', convIds);
        await supabase.from('admin_conversations').delete().in('id', convIds);
      }
      await supabase.from('admin_contacts').delete().in('id', contactIds);
    }
  }

  console.log('\n--- 3. Testing WhatsApp Human Takeover & Fail-Closed Guard ---');
  if (supabase && waConversationId) {
    // Activate human takeover on conversation
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: true, automation_paused: true })
      .eq('id', waConversationId);

    // Test 3.1: check_takeover using phone returns can_respond: false
    const waTakeoverReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'check_takeover',
        phone: testPhoneRaw,
      }),
    });
    const waTakeoverRes = await n8nPost(waTakeoverReq);
    const waTakeoverData = await waTakeoverRes.json();
    assert(waTakeoverData.can_respond === false, 'Active takeover for phone returns can_respond: false');
    assert(waTakeoverData.manual_takeover === true, 'manual_takeover flag is true');

    // Test 3.2: Outbound AI reply logging rejected during takeover
    const waAiLogReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'log_whatsapp_reply',
        conversation_id: waConversationId,
        content: 'This AI reply should be rejected because takeover is active',
        external_message_id: `wamid.reply.${Date.now()}`,
      }),
    });
    const waAiLogRes = await n8nPost(waAiLogReq);
    const waAiLogData = await waAiLogRes.json();
    assert(waAiLogRes.status === 409, 'WhatsApp AI reply rejected with HTTP 409 during active takeover');
    assert(waAiLogData.rejected === true, 'rejected flag is true');

    // Resume takeover and test successful AI reply logging
    await supabase
      .from('admin_conversations')
      .update({ manual_takeover: false, automation_paused: false })
      .eq('id', waConversationId);

    const waAiValidReplyId = `wamid.reply.success.${Date.now()}`;
    const waAiValidLogReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event_type: 'log_whatsapp_reply',
        conversation_id: waConversationId,
        content: 'Here is information on our automation services.',
        external_message_id: waAiValidReplyId,
      }),
    });
    const waAiValidRes = await n8nPost(waAiValidLogReq);
    const waAiValidData = await waAiValidRes.json();
    assert(waAiValidRes.status === 200, 'WhatsApp AI reply logged with HTTP 200 when takeover inactive');
    assert(waAiValidData.action === 'whatsapp_reply_logged', 'action is whatsapp_reply_logged');

    // Verify reply in database
    const { data: replyRow } = await supabase
      .from('admin_messages')
      .select('sender_type, status')
      .eq('external_message_id', waAiValidReplyId)
      .single();
    assert(replyRow?.sender_type === 'automation_ai', 'AI reply has sender_type: automation_ai');
    assert(replyRow?.status === 'sent', 'AI reply has status: sent (never fake delivered)');

    // Clean up WhatsApp test data
    await supabase.from('admin_messages').delete().eq('conversation_id', waConversationId);
    await supabase.from('admin_conversations').delete().eq('id', waConversationId);
    if (waContactId) {
      await supabase.from('admin_contacts').delete().eq('id', waContactId);
    }
    console.log('  ✓ Cleaned up isolated WhatsApp test data from Supabase');
  }

  console.log('\n--- 4. Testing Instagram Regression & Backward Compatibility ---');
  // Test 4.1: Missing sender_id on Instagram MUST be rejected with 400
  const igNoIdReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_instagram_message',
      username: 'test_ig_only',
      content: 'Hello without IGSID',
    }),
  });
  const igNoIdRes = await n8nPost(igNoIdReq);
  assert(igNoIdRes.status === 400, 'Instagram requires sender_id (rejected with 400)');

  // Test 4.2: Valid incoming Instagram message ingestion
  const testIgsid = `test_igsid_${Date.now()}`;
  const testIgMid = `mid.test.${Date.now()}`;
  const igIngestReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_instagram_message',
      sender_id: testIgsid,
      username: 'test_client_ig',
      content: 'Inquiry via Instagram',
      external_message_id: testIgMid,
    }),
  });
  const igIngestRes = await n8nPost(igIngestReq);
  const igIngestData = await igIngestRes.json();
  assert(igIngestRes.status === 200, 'Instagram message ingested with 200');
  assert(igIngestData.success === true, 'Instagram response marked success: true');
  assert(igIngestData.can_respond === true, 'Instagram can_respond is true');

  // Clean up Instagram test data
  if (supabase && igIngestData.conversation_id) {
    await supabase.from('admin_messages').delete().eq('conversation_id', igIngestData.conversation_id);
    await supabase.from('admin_conversations').delete().eq('id', igIngestData.conversation_id);
    if (igIngestData.contact_id) {
      await supabase.from('admin_contacts').delete().eq('id', igIngestData.contact_id);
    }
    console.log('  ✓ Cleaned up isolated Instagram test data from Supabase');
  }

  console.log('\n--- 5. Testing Protected Endpoints & Zero Fake Simulation ---');
  const { POST: igSendPost } = await import('../src/app/api/instagram/send/route.ts');
  const unauthSendReq = new Request('http://localhost/api/instagram/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: 'test', content: 'test' }),
  });
  const unauthSendRes = await igSendPost(unauthSendReq);
  assert(unauthSendRes.status === 401, 'Unauthenticated /api/instagram/send rejected with 401');

  const { POST: waSendPost } = await import('../src/app/api/whatsapp/send/route.ts');
  const waSendReq = new Request('http://localhost/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: '+919999999999', content: 'test' }),
  });
  const waSendRes = await waSendPost(waSendReq);
  assert(waSendRes.status === 503, 'WhatsApp send returns 503 when credentials missing (no simulation)');

  console.log('\n--- 6. Testing User Exact n8n Workflow Payload & Field Mappings ---');
  const userTestPhone = '+91987650' + Math.floor(1000 + Math.random() * 9000);
  const userTestWamid = `wamid.HBgL.${Date.now()}`;
  const userExactPayload = {
    event_type: 'incoming_whatsapp_message',
    platform: 'whatsapp',
    phone: userTestPhone,
    phone_number: userTestPhone,
    whatsapp_id: userTestPhone.replace(/[^0-9]/g, ''),
    contact_name: 'Aman Verma',
    direction: 'inbound',
    sender_type: 'customer',
    content: 'Hello from n8n live automation workflow',
    external_message_id: userTestWamid,
    wa_message_id: userTestWamid,
    message_type: 'text',
    timestamp: '1729601234',
    metadata: { waba_id: '1234567890', flow: 'live_test' },
  };

  const userReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(userExactPayload),
  });

  const userRes = await n8nPost(userReq);
  const userData = await userRes.json();
  assert(userRes.status === 200, 'User exact n8n payload accepted with HTTP 200');
  assert(userData.success === true, 'Response marked success: true');
  assert(Boolean(userData.conversation_id), 'Conversation created/resolved');
  assert(userData.can_respond === true, 'can_respond returns true for automated AI reply flow');

  if (supabase && userData.conversation_id) {
    // 6.2 Verify contact created with contact_name & normalized phone
    const { data: contact } = await supabase
      .from('admin_contacts')
      .select('name, phone')
      .eq('id', userData.contact_id)
      .single();
    assert(contact?.name === 'Aman Verma', `Contact name correctly saved as contact_name (got: ${contact?.name})`);
    assert(contact?.phone === userTestPhone, `Contact phone correctly saved as normalized phone (got: ${contact?.phone})`);

    // 6.3 Verify conversation created with whatsapp platform
    const { data: conv } = await supabase
      .from('admin_conversations')
      .select('platform, status, last_message')
      .eq('id', userData.conversation_id)
      .single();
    assert(conv?.platform === 'whatsapp', 'Conversation platform is whatsapp');
    assert(conv?.status === 'open', 'Conversation status is open');
    assert(conv?.last_message === 'Hello from n8n live automation workflow', 'Conversation last_message updated');

    // 6.4 Verify message created with sender_type customer and status sent
    const { data: msg } = await supabase
      .from('admin_messages')
      .select('sender_type, sender_name, content, status, external_message_id')
      .eq('external_message_id', userTestWamid)
      .single();
    assert(msg?.sender_type === 'customer', 'Message sender_type is customer');
    assert(msg?.sender_name === 'Aman Verma', `Message sender_name matches contact_name (got: ${msg?.sender_name})`);
    assert(msg?.status === 'sent', 'Message status is sent (never fake delivered)');
    assert(msg?.external_message_id === userTestWamid, 'Message external_message_id matches Meta wamid');

    // 6.5 Verify duplicate message prevention on retry
    const dupUserReq = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(userExactPayload),
    });
    const dupUserRes = await n8nPost(dupUserReq);
    const dupUserData = await dupUserRes.json();
    assert(dupUserData.deduplicated === true, 'Duplicate message detected using Meta message ID');
    assert(dupUserData.can_respond === false, 'Duplicate message halts response (can_respond: false)');

    // Clean up
    await supabase.from('admin_messages').delete().eq('conversation_id', userData.conversation_id);
    await supabase.from('admin_conversations').delete().eq('id', userData.conversation_id);
    if (userData.contact_id) {
      await supabase.from('admin_contacts').delete().eq('id', userData.contact_id);
    }
    console.log('  ✓ Cleaned up user exact payload test records from Supabase');
  }

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
