import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured as hasSupabaseConfiguration,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";

let browserClient: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return hasSupabaseConfiguration();
}

export function getBrowserSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no está configurado.");
  }

  browserClient ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}
