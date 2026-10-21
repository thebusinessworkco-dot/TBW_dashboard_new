import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return mock-friendly or fallback client when keys are not yet connected in env
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
