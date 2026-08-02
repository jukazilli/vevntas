import { NextRequest, NextResponse } from "next/server";
import { isResendConfigured } from "@/lib/email";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    const { data, error } = await supabase
      .from("stores")
      .select("exchange_rate_mode,exchange_rate_source,allow_negative_stock")
      .eq("id", profile.store_id)
      .single();
    if (error) throw error;
    return NextResponse.json({ data: { ...data, resend_configured: isResendConfigured() } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (profile.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede cambiar la configuración." }, { status: 403 });
    const body = (await request.json()) as { exchange_rate_mode?: "automatic" | "manual" };
    if (!body.exchange_rate_mode || !["automatic", "manual"].includes(body.exchange_rate_mode)) {
      return NextResponse.json({ error: "Seleccione una prioridad de tasa válida." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("stores")
      .update({ exchange_rate_mode: body.exchange_rate_mode })
      .eq("id", profile.store_id)
      .select("exchange_rate_mode,exchange_rate_source,allow_negative_stock")
      .single();
    if (error) throw error;
    return NextResponse.json({ data: { ...data, resend_configured: isResendConfigured() } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
