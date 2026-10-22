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

  // Test 1.4: Meta WhatsApp Cloud API exact interactive action structure with Book Appointment and Explore Services
  const testWamidOutgoing3 = 'wamid.HBgM' + Date.now() + 'TESTMETA';
  const outReq3 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation_rule',
      message_type: 'interactive',
      metadata: {
        interactive: {
          type: 'button',
          body: {
            text: 'Welcome to The Business Work! 👋\nHow can we help you today?',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'tbw_intent_appointment',
                  title: 'Book Appointment',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'tbw_intent_service',
                  title: 'Explore Services',
                },
              },
            ],
          },
        },
      },
      external_message_id: testWamidOutgoing3,
    }),
  });
  const outRes3 = await n8nPost(outReq3);
  const outData3 = await outRes3.json();
  assert(outRes3.status === 200, 'Meta action.buttons interactive message logged with 200');
  assert(outData3.success === true, 'Meta action.buttons success is true');

  // Verify stored in Supabase with resolved content from interactive.body.text
  const { data: savedMetaMsg } = await supabase
    .from('admin_messages')
    .select('*')
    .eq('external_message_id', testWamidOutgoing3)
    .single();
  assert(savedMetaMsg, 'Saved message found in Supabase');
  assert(
    savedMetaMsg.content === 'Welcome to The Business Work! 👋\nHow can we help you today?',
    'Content automatically resolved from interactive.body.text'
  );
  assert(
    savedMetaMsg.metadata?.interactive?.action?.buttons?.length === 2,
    'Stored metadata contains both action.buttons'
  );
  assert(
    savedMetaMsg.metadata?.interactive?.action?.buttons[0].reply?.title === 'Book Appointment',
    'First button title matches Book Appointment'
  );
  assert(
    savedMetaMsg.metadata?.interactive?.action?.buttons[1].reply?.title === 'Explore Services',
    'Second button title matches Explore Services'
  );

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

  console.log('\n--- 4. Testing Appointment Flow & Deterministic Ordering ---');

  // Test 4.1: Outgoing Appointment Available Dates & Time Slots
  const apptSlotsWamid = `wamid.OUT_APPT_${Date.now()}`;
  const apptSlotsReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation_ai',
      content: 'Please choose an available appointment date and time for your consultation:',
      external_message_id: apptSlotsWamid,
      metadata: {
        appointment: {
          available_dates: ['2026-10-23', '2026-10-24', '2026-10-25'],
          available_slots: ['10:00 AM', '02:00 PM', '04:30 PM'],
          service_name: 'Full Stack Web Development & AI Automation',
        },
      },
    }),
  });
  const apptSlotsRes = await n8nPost(apptSlotsReq);
  const apptSlotsData = await apptSlotsRes.json();
  assert(apptSlotsRes.status === 200, 'Outgoing appointment slots ingested with 200');
  assert(apptSlotsData.success === true, 'Response marked success: true');

  // Verify appointment metadata stored in Supabase
  if (supabase && apptSlotsData.message_id) {
    const { data: dbApptMsg } = await supabase
      .from('admin_messages')
      .select('metadata')
      .eq('id', apptSlotsData.message_id)
      .maybeSingle();

    const storedMeta = typeof dbApptMsg?.metadata === 'string'
      ? JSON.parse(dbApptMsg.metadata)
      : dbApptMsg?.metadata;

    assert(
      storedMeta?.appointment?.available_dates?.length === 3,
      'Appointment available_dates preserved accurately in message metadata'
    );
    assert(
      storedMeta?.appointment?.available_slots?.includes('02:00 PM'),
      'Appointment available_slots preserved accurately in message metadata'
    );
  }

  // Test 4.2: Outgoing Booking Confirmation
  const apptConfirmWamid = `wamid.OUT_CONFIRM_${Date.now()}`;
  const confirmReq = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation_ai',
      content: 'Your appointment has been confirmed! We look forward to meeting you.',
      external_message_id: apptConfirmWamid,
      metadata: {
        appointment: {
          status: 'confirmed',
          confirmation_id: 'TBW-APPT-8899',
          service_name: 'AI Automation Strategy',
          date: '2026-10-24',
          time: '02:00 PM',
          customer_name: 'Test Customer',
        },
      },
    }),
  });
  const confirmRes = await n8nPost(confirmReq);
  const confirmData = await confirmRes.json();
  assert(confirmRes.status === 200, 'Booking confirmation ingested with 200');
  assert(confirmData.success === true, 'Booking confirmation marked success: true');

  // Test 4.3: Rapid-fire duplicate suppression when external_message_id is absent
  const identicalContent = `Rapid duplicate test content ${Date.now()}`;
  const rapidReq1 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation_ai',
      content: identicalContent,
      // No external_message_id
    }),
  });
  const rapidRes1 = await n8nPost(rapidReq1);
  const rapidData1 = await rapidRes1.json();
  assert(rapidRes1.status === 200, 'Initial message without external ID saved with 200');
  assert(rapidData1.success === true, 'Initial message response success: true');

  const rapidReq2 = new Request('http://localhost/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: testPhone,
      sender_type: 'automation_ai',
      content: identicalContent,
      // Identical message sent immediately without external ID
    }),
  });
  const rapidRes2 = await n8nPost(rapidReq2);
  const rapidData2 = await rapidRes2.json();
  assert(rapidRes2.status === 200, 'Rapid duplicate request returned 200');
  assert(rapidData2.deduplicated === true, 'Rapid duplicate correctly suppressed with deduplicated: true');

  // Test 4.4: Deterministic Sorting logic verification
  const { sortMessagesDeterministic } = await import('../src/lib/store/dashboard-store.tsx');
  const tieTime = '2026-10-22T15:00:00.000Z';
  const earlierTime = '2026-10-22T14:59:59.999Z';
  const laterTime = '2026-10-22T15:00:00.001Z';

  const testMessages = [
    { id: 'msg-3', created_at: tieTime, sender_type: 'automation_ai', content: 'Bot reply' },
    { id: 'msg-1', created_at: earlierTime, sender_type: 'customer', content: 'Earlier greeting' },
    { id: 'msg-2', created_at: tieTime, sender_type: 'customer', content: 'Customer request at tie' },
    { id: 'msg-4', created_at: laterTime, sender_type: 'automation_ai', content: 'Later follow-up' },
  ];

  const sorted = sortMessagesDeterministic(testMessages);
  assert(sorted[0].id === 'msg-1', 'Earlier message sorted first');
  assert(sorted[1].id === 'msg-2', 'Customer message precedes bot reply on exact timestamp tie');
  assert(sorted[2].id === 'msg-3', 'Bot reply placed after customer message on exact timestamp tie');
  assert(sorted[3].id === 'msg-4', 'Later message sorted last');

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
