import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { loadEnv } from './env.js';

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export function __setSupabaseClient(client: SupabaseClient | null) {
  cachedClient = client;
}
