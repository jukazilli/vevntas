import { getBrowserSupabase } from "@/lib/supabase/client";

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión no disponible.");

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Error HTTP ${response.status}`);
  return payload;
}
