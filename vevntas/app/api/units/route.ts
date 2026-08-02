import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    const { data, error } = await supabase
      .from("unit_measures")
      .select("id,code,name,allows_decimals,active")
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (profile.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede crear unidades." }, { status: 403 });
    const body = (await request.json()) as { code?: string; name?: string; allows_decimals?: boolean };
    const code = body.code?.trim().toUpperCase();
    const name = body.name?.trim();
    if (!code || !name || !/^[A-Z0-9]{1,10}$/.test(code)) {
      return NextResponse.json({ error: "Código y nombre de unidad son obligatorios." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("unit_measures")
      .insert({ store_id: profile.store_id, code, name, allows_decimals: Boolean(body.allows_decimals) })
      .select("id,code,name,allows_decimals,active")
      .single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
