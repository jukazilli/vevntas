import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(["admin", "stock"] as string[]).includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permiso para ajustar existencias." }, { status: 403 });
    }

    const body = (await request.json()) as { product_id?: string; quantity_delta?: number; reason?: string };
    if (!body.product_id || !Number.isFinite(Number(body.quantity_delta)) || Number(body.quantity_delta) === 0) {
      return NextResponse.json({ error: "Producto y cantidad son obligatorios." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("adjust_stock", {
      p_store_id: profile.store_id,
      p_product_id: body.product_id,
      p_quantity_delta: Number(body.quantity_delta),
      p_reason: body.reason?.trim() || "Ajuste manual",
    });
    if (error) throw error;
    return NextResponse.json({ data: { stock_quantity: Number(data) } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
