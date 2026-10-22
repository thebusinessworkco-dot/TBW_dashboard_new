// ==============================================================================
// TEST SUITE: OUTGOING WHATSAPP LOGGING, STATUS RECEIPTS & RICH METADATA
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
  const { POST: n8nPost } = await import('../src/app/api/n8n/webhook/route.ts');
  const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
  const supabase = createAdminClient();

  const testPhone = '+919876543210';
  const testWamidOutgoing1 = `wamid.OUT_${Date.now()}_1`;
  const testWamidOutgoing2 = `wamid.OUT_${Date.now()}_2`;
  const testWamidStatus = `wamid.STATUS_${Date.now()}_3`;
  const testWamidButtonReply = `wamid.IN_BTN_${Date.now()}_4`;
  const testWamidListReply = `wamid.IN_LIST_${Date.now()}_5`;
  const testWamidFlowReply = `wamid.IN_FLOW_${Date.now()}_6`;
  const testWamidLocation = `wamid.IN_LOC_${Date.now()}_7`;

  console.log('\n--- 1. Testing outgoing_whatsapp_message Logging ---');

  // Test 1.1: Outgoing AI message logging
  const outReq1 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'ai',
      content: 'Hello! I am your AI assistant. How can we help your business today?',
      external_message_id: testWamidOutgoing1,
      direction: 'outbound',
    }),
  });

  const outRes1 = await n8nPost(outReq1);
  const outData1 = await outRes1.json();
  assert(outRes1.status === 200, 'outgoing_whatsapp_message returned 200');
  assert(outData1.success === true, 'Response marked success: true');
  assert(outData1.conversation_id, 'Conversation ID returned');
  assert(outData1.message_id, 'Message ID returned');

  // Verify message record in Supabase
  if (supabase && outData1.message_id) {
    const { data: dbMsg } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('id', outData1.message_id)
      .maybeSingle();

    assert(dbMsg !== null, 'Message successfully saved in Supabase');
    assert(dbMsg?.sender_type === 'automation_ai', 'sender_type correctly normalized to automation_ai');
    assert(dbMsg?.status === 'sent', 'status initialized strictly to sent');
    assert(dbMsg?.external_message_id === testWamidOutgoing1, 'external_message_id matches Meta wamid');
  }

  // Test 1.2: Idempotency with duplicate wamid
  const dupReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      content: 'Hello! (Duplicate attempt)',
      external_message_id: testWamidOutgoing1,
    }),
  });
  const dupRes = await n8nPost(dupReq);
  const dupData = await dupRes.json();
  assert(dupData.success === true, 'Duplicate outgoing request returns success: true');
  assert(dupData.deduplicated === true, 'Duplicate outgoing request marked deduplicated: true');

  // Test 1.3: Outgoing interactive message with buttons
  const outReq2 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation',
      content: 'Please choose an option below:',
      message_type: 'interactive',
      interactive: {
        type: 'button',
        buttons: [
          { id: 'btn_book', title: 'Book Consultation' },
          { id: 'btn_pricing', title: 'View Pricing' },
        ],
      },
      external_message_id: testWamidOutgoing2,
    }),
  });
  const outRes2 = await n8nPost(outReq2);
  await outRes2.json();
  assert(outRes2.status === 200, 'Interactive outgoing message logged with 200');

  console.log('\n--- 2. Testing whatsapp_status_update Receipt Handling ---');

  // Create message to test status transitions
  const createForStatusReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      content: 'Testing status receipts flow',
      external_message_id: testWamidStatus,
    }),
  });
  await n8nPost(createForStatusReq);

  // Test 2.1: Transition to 'delivered'
  const statusReq1 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'whatsapp_status_update',
      external_message_id: testWamidStatus,
      status: 'delivered',
    }),
  });
  const statusRes1 = await n8nPost(statusReq1);
  const statusData1 = await statusRes1.json();
  assert(statusRes1.status === 200, 'Delivered status update returned 200');
  assert(statusData1.status === 'delivered', 'Status updated to delivered');

  // Test 2.2: Transition to 'read'
  const statusReq2 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'message_status_update',
      wamid: testWamidStatus,
      status: 'read',
    }),
  });
  const statusRes2 = await n8nPost(statusReq2);
  const statusData2 = await statusRes2.json();
  assert(statusRes2.status === 200, 'Read status update returned 200');
  assert(statusData2.status === 'read', 'Status updated to read');

  // Verify DB state for status
  if (supabase) {
    const { data: dbStatusMsg } = await supabase
      .from('admin_messages')
      .select('status')
      .eq('external_message_id', testWamidStatus)
      .maybeSingle();
    assert(dbStatusMsg?.status === 'read', 'DB status correctly reflects read receipt');
  }

  // Test 2.3: Invalid status rejected with 400
  const invalidStatusReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'whatsapp_status_update',
      wamid: testWamidStatus,
      status: 'non_existent_status',
    }),
  });
  const invalidStatusRes = await n8nPost(invalidStatusReq);
  assert(invalidStatusRes.status === 400, 'Invalid status rejected with 400');

  console.log('\n--- 3. Testing Incoming Interactive Messages (Buttons, Lists, Flows, Locations) ---');

  // Test 3.1: Incoming Button Reply
  const btnReplyReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhone,
      message_type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: 'btn_book',
          title: 'Book Consultation',
        },
      },
      external_message_id: testWamidButtonReply,
    }),
  });
  const btnReplyRes = await n8nPost(btnReplyReq);
  const btnReplyData = await btnReplyRes.json();
  assert(btnReplyRes.status === 200, 'Incoming button reply ingested with 200');
  assert(btnReplyData.success === true, 'Button reply response success: true');

  // Test 3.2: Incoming List Reply
  const listReplyReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhone,
      message_type: 'interactive',
      interactive: {
        type: 'list_reply',
        list_reply: {
          id: 'svc_automation',
          title: 'Complete Workflow Automation',
          description: 'n8n & Meta Cloud API',
        },
      },
      external_message_id: testWamidListReply,
    }),
  });
  const listReplyRes = await n8nPost(listReplyReq);
  assert(listReplyRes.status === 200, 'Incoming list reply ingested with 200');

  // Test 3.3: Incoming WhatsApp Flow Submission
  const flowReplyReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhone,
      message_type: 'interactive',
      interactive: {
        type: 'nfm_reply',
        nfm_reply: {
          name: 'booking_flow',
          response_json: '{"service":"Web Dev","preferred_time":"11:00 AM"}',
        },
      },
      external_message_id: testWamidFlowReply,
    }),
  });
  const flowReplyRes = await n8nPost(flowReplyReq);
  assert(flowReplyRes.status === 200, 'Incoming Flow submission ingested with 200');

  // Test 3.4: Incoming Location
  const locReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: testPhone,
      message_type: 'location',
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
        name: 'Connaught Place',
        address: 'New Delhi, Delhi 110001',
      },
      external_message_id: testWamidLocation,
    }),
  });
  const locRes = await n8nPost(locReq);
  assert(locRes.status === 200, 'Incoming location ingested with 200');

  // Clean up all test-generated records from database
  if (supabase) {
    const { data: contacts } = await supabase
      .from('admin_contacts')
      .select('id')
      .or(`phone.eq.${testPhone},phone.eq.+${testPhone.replace(/[^0-9]/g, '')}`);

    if (contacts && contacts.length > 0) {
      const cIds = contacts.map((c) => c.id);
      const { data: convs } = await supabase
        .from('admin_conversations')
        .select('id')
        .in('contact_id', cIds);

      if (convs && convs.length > 0) {
        const cvIds = convs.map((cv) => cv.id);
        await supabase.from('admin_messages').delete().in('conversation_id', cvIds);
        await supabase.from('admin_conversations').delete().in('id', cvIds);
      }
      await supabase.from('admin_contacts').delete().in('id', cIds);
    }
    console.log('✓ Cleaned up all outgoing logging and rich metadata test records from Supabase');
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
