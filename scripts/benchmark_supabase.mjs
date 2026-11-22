import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    env[k] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

async function benchmark() {
  const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const phone = '917821840347';
  const cleanPhone = '917821840347';
  const formattedPhone = '+917821840347';
  const tenDigit = cleanPhone.slice(-10);
  const with91 = '91' + tenDigit;
  const formattedWith91 = '+91' + tenDigit;

  console.log('--- Benchmarking Supabase Queries for mode check ---');
  let t0 = Date.now();
  const { data: contacts, error: cErr } = await adminSupabase
    .from('admin_contacts')
    .select('id, name, company_name')
    .or(
      `phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${with91},phone.eq.${formattedWith91},phone.ilike.%${tenDigit}`
    )
    .order('created_at', { ascending: true })
    .limit(1);
  console.log(`Query 1 (contacts with ilike): ${Date.now() - t0}ms, found:`, contacts?.length, cErr?.message || '');

  t0 = Date.now();
  const { data: contactsIndexed } = await adminSupabase
    .from('admin_contacts')
    .select('id, name, company_name')
    .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${with91},phone.eq.${formattedWith91}`)
    .limit(1);
  console.log(`Query 2 (contacts indexed, no ilike): ${Date.now() - t0}ms, found:`, contactsIndexed?.length);

  if (contacts?.[0]) {
    t0 = Date.now();
    const { data: conv } = await adminSupabase
      .from('admin_conversations')
      .select('id, manual_takeover, automation_paused, status, internal_notes')
      .eq('contact_id', contacts[0].id)
      .eq('platform', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    console.log(`Query 3 (conversation): ${Date.now() - t0}ms, conv:`, conv?.id);
  }
}

benchmark().catch(console.error);
