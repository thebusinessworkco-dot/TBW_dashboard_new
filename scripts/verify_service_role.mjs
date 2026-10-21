import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkeostxsprhhknmznpke.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyServiceRole() {
  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from('admin_integration_status').select('*');
  if (error) {
    console.error('Service Role Query Error:', error);
    process.exit(1);
  }

  console.log('SUCCESS! Service Role Key connected and verified against Supabase.');
}

verifyServiceRole();
