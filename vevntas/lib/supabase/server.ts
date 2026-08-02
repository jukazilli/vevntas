import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Profile } from "@/lib/types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export function createRequestSupabase(request: NextRequest): SupabaseClient {
  const authorization = request.headers.get("authorization");
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
  });
}

export async function requireUserAndProfile(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User; profile: Profile }> {
  const supabase = createRequestSupabase(request);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Response("No autorizado", { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,store_id,full_name,role,active")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile?.active) throw new Response("Perfil inactivo o inexistente", { status: 403 });
  return { supabase, user: data.user, profile: profile as Profile };
}
