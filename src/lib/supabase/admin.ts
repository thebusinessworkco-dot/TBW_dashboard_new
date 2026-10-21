import { createClient } from '@supabase/supabase-js';

/**
 * Creates an administrative Supabase client using the Service Role Key.
 * Bypasses Row Level Security (RLS) for trusted server-side operations:
 * - Ingesting Meta WhatsApp Cloud API webhooks
 * - Updating message delivery status receipts
 * - Executing server-to-server n8n webhook syncs
 *
 * NOTE: Never expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
