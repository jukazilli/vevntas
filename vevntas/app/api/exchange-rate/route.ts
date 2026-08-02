import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("rate,source,reference_at,fetched_at,is_manual")
      .eq("store_id", profile.store_id)
      .order("reference_at", { ascending: false })
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      data: data
        ? { ...data, rate: Number(data.rate) }
        : { rate: null, source: "Sin configurar", reference_at: null, fetched_at: null, is_manual: false },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile, user } = await requireUserAndProfile(request);
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Solo el administrador puede configurar la tasa." }, { status: 403 });
    }
    const body = (await request.json()) as { rate?: number; source?: string; reference_at?: string };
    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "La tasa debe ser mayor que cero." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("exchange_rates")
      .insert({
        store_id: profile.store_id,
        rate,
        source: body.source?.trim() || "MANUAL",
        reference_at: body.reference_at || new Date().toISOString(),
        is_manual: true,
        created_by: user.id,
      })
      .select("rate,source,reference_at,fetched_at,is_manual")
      .single();
    if (error) throw error;
    return NextResponse.json({ data: { ...data, rate: Number(data.rate) } }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
