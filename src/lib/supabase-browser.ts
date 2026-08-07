import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client suitable for browser-side usage (auth, realtime).
 * Uses NEXT_PUBLIC_ env vars which are available on the client.
 * Returns null if Supabase is not configured.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  browserClient = createClient(url, key);
  return browserClient;
}
