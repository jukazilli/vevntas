import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";
import type { PurchaseItemInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(profile.role === "admin" || profile.role === "stock")) {
      return NextResponse.json({ error: "No tiene permiso para registrar compras." }, { status: 403 });
    }
    const body = (await request.json()) as {
      items?: PurchaseItemInput[];
      supplier_name?: string;
      invoice_reference?: string;
      notes?: string;
    };
    if (!body.items?.length) {
      return NextResponse.json({ error: "Agregue al menos un producto a la compra." }, { status: 400 });
    }
    const invalid = body.items.some((item) => !item.product_id || Number(item.quantity) <= 0 || Number(item.unit_cost_usd) < 0);
    if (invalid) return NextResponse.json({ error: "Revise cantidades y costos de compra." }, { status: 400 });

    const { data, error } = await supabase.rpc("register_purchase", {
      p_store_id: profile.store_id,
      p_items: body.items,
      p_supplier_name: body.supplier_name || null,
      p_invoice_reference: body.invoice_reference || null,
      p_notes: body.notes || null,
    });
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
