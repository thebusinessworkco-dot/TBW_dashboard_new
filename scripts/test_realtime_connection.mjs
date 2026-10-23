import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local
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

import('../src/lib/supabase/client.ts').then(async ({ createClient }) => {
  const supabase = createClient();
  const { createAdminClient } = await import('../src/lib/supabase/admin.ts');
  const adminSupabase = createAdminClient();

  console.log('Testing Realtime Broadcast on INSERT...');
  let eventReceived = false;

  const channel = supabase
    .channel('test_broadcast_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'admin_messages' },
      (payload) => {
        console.log('✓ REALTIME INSERT RECEIVED:', payload.new?.id, payload.new?.content);
        eventReceived = true;
      }
    )
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Channel SUBSCRIBED. Triggering test insert...');
        // Insert a temporary test message
        const { data: conv } = await adminSupabase.from('admin_conversations').select('id').limit(1).single();
        if (conv) {
          const { data: testMsg } = await adminSupabase
            .from('admin_messages')
            .insert({
              conversation_id: conv.id,
              content: 'Temporary Realtime Test Probe',
              sender_type: 'customer',
              created_at: new Date().toISOString(),
              is_demo: true,
            })
            .select('id')
            .single();

          setTimeout(async () => {
            if (testMsg?.id) {
              await adminSupabase.from('admin_messages').delete().eq('id', testMsg.id);
            }
            supabase.removeChannel(channel);
            console.log(eventReceived ? '✓ REALTIME IS FULLY BROADCASTING!' : '✗ NO REALTIME BROADCAST RECEIVED (Table not in publication or RLS blocking)');
            process.exit(eventReceived ? 0 : 1);
          }, 3000);
        }
      }
    });
});
