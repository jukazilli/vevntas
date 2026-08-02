import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(profile.role === "admin" || profile.role === "stock")) {
      return NextResponse.json({ error: "No tiene permiso para ajustar el inventario." }, { status: 403 });
    }
    const body = (await request.json()) as { product_id?: string; physical_quantity?: number; reason?: string };
    const physical = Number(body.physical_quantity);
    if (!body.product_id || !Number.isFinite(physical) || physical < 0) {
      return NextResponse.json({ error: "Producto y cantidad física válida son obligatorios." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("reconcile_stock", {
      p_store_id: profile.store_id,
      p_product_id: body.product_id,
      p_physical_quantity: physical,
      p_reason: body.reason?.trim() || "Conteo físico de inventario",
    });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
