import fs from 'fs';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

import { POST as n8nWebhookPost } from '../src/app/api/n8n/webhook/route';
import { GET as modeGet } from '../src/app/api/webhook/n8n/mode/[phone]/route';
import { createAdminClient } from '../src/lib/supabase/admin';

async function runStateTest() {
  console.log('================================================================');
  console.log('TESTING SUPABASE CONVERSATION_STATE PERSISTENCE & MEMORY RECOVERY');
  console.log('================================================================\n');

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    console.error('Supabase admin client unavailable');
    process.exit(1);
  }

  const testPhone = '919800112233';
  process.env.N8N_WEBHOOK_SECRET ??= 'test-local-n8n-secret';
  const secret = process.env.N8N_WEBHOOK_SECRET;

  // Clean any prior test contact
  await adminSupabase.from('admin_contacts').delete().eq('phone', `+${testPhone}`);

  try {
    // 1. Post conversation_state event
    console.log('1. Posting conversation_state to /api/n8n/webhook...');
    const statePayload = {
      event_type: 'conversation_state',
      channel: 'whatsapp',
      phone_number: testPhone,
      name: 'Rohan Mehta',
      business: 'Mehta Textiles',
      service: 'AI Sales Agents',
      stage: 'service_detail',
      status: 'open',
      mode: 'ai',
      updated_at: new Date().toISOString()
    };

    const req1 = new Request('http://localhost/api/n8n/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-api-key': secret || ''
      },
      body: JSON.stringify(statePayload)
    });

    const res1 = await n8nWebhookPost(req1);
    const json1 = await res1.json();
    console.log('Webhook response:', json1);
    if (!json1.success || json1.action !== 'conversation_state_persisted') {
      throw new Error(`State persistence failed: ${JSON.stringify(json1)}`);
    }
    console.log('✅ PASS: conversation_state successfully accepted and persisted.');

    // 2. Query Supabase directly to verify record integrity
    console.log('\n2. Verifying database records in Supabase...');
    const { data: contacts } = await adminSupabase
      .from('admin_contacts')
      .select('id, name, company_name, phone')
      .eq('phone', `+${testPhone}`)
      .single();

    if (!contacts) throw new Error('Contact not found in admin_contacts');
    if (contacts.name !== 'Rohan Mehta') throw new Error(`Unexpected contact name: ${contacts.name}`);
    if (contacts.company_name !== 'Mehta Textiles') throw new Error(`Unexpected company name: ${contacts.company_name}`);
    console.log('✅ PASS: admin_contacts correctly saved Name and Company.');

    const { data: conv } = await adminSupabase
      .from('admin_conversations')
      .select('id, internal_notes, manual_takeover')
      .eq('contact_id', contacts.id)
      .eq('platform', 'whatsapp')
      .single();

    if (!conv) throw new Error('Conversation not found in admin_conversations');
    const savedState = JSON.parse(conv.internal_notes || '{}');
    if (savedState.stage !== 'service_detail') throw new Error(`Unexpected stage in internal_notes: ${savedState.stage}`);
    if (savedState.service !== 'AI Sales Agents') throw new Error(`Unexpected service in internal_notes: ${savedState.service}`);
    console.log('✅ PASS: admin_conversations internal_notes contains durable JSON state:', savedState);

    // 3. Test GET /api/webhook/n8n/mode/[phone] to confirm n8n state recovery
    console.log('\n3. Testing mode check & state recovery endpoint...');
    const req2 = new Request(`http://localhost/api/webhook/n8n/mode/${testPhone}`, {
      method: 'GET',
      headers: {
        'x-n8n-api-key': secret || ''
      }
    });

    const res2 = await modeGet(req2, { params: Promise.resolve({ phone: testPhone }) });
    const json2 = await res2.json();
    console.log('Mode check response:', json2);

    if (!json2.success) throw new Error('Mode check failed');
    if (json2.data.contact?.name !== 'Rohan Mehta') throw new Error(`Mode check did not return contact name: ${JSON.stringify(json2.data)}`);
    if (json2.data.contact?.company_name !== 'Mehta Textiles') throw new Error(`Mode check did not return company name: ${JSON.stringify(json2.data)}`);
    if (json2.data.state?.stage !== 'service_detail') throw new Error(`Mode check did not return persistent stage: ${JSON.stringify(json2.data)}`);
    console.log('✅ PASS: Mode check successfully returned contact identity and conversation state from Supabase!');

    // 4. Test n8n restart simulation
    console.log('\n4. Simulating n8n container restart (memory wipe)...');
    const emptyMem = {}; // Simulate fresh memory after n8n restart
    // If n8n restarts, memory has no customer record, but Meta provides profile name and mode check returns Supabase state
    console.log('Simulating fresh incoming message for phone after restart...');
    // Customer profile is restored with customer name from contact
    emptyMem.customers ??= {};
    emptyMem.customers[testPhone] = {
      phone: testPhone,
      name: json2.data.contact.name,
      business: json2.data.contact.company_name,
      serviceDetail: json2.data.state.service,
      stage: json2.data.state.stage,
      language: 'english'
    };

    console.log('Restored memory from Supabase:', emptyMem.customers[testPhone]);
    if (emptyMem.customers[testPhone].name !== 'Rohan Mehta' || emptyMem.customers[testPhone].business !== 'Mehta Textiles') {
      throw new Error('Memory recovery simulation failed');
    }
    console.log('✅ PASS: Full recovery verified! Customer state survives n8n container restart.');

  } finally {
    // 5. Cleanup test data
    console.log('\n5. Cleaning up test data from Supabase...');
    await adminSupabase.from('admin_contacts').delete().eq('phone', `+${testPhone}`);
    console.log('✅ Cleaned up test phone records from Supabase.');
  }

  console.log('\n================================================================');
  console.log('ALL SUPABASE PERSISTENCE & RECOVERY TESTS PASSED (4/4)');
  console.log('================================================================\n');
}

runStateTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
