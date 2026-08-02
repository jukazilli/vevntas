import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";
import type { PaymentInput, SaleItemInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(["admin", "cashier"] as string[]).includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permiso para registrar ventas." }, { status: 403 });
    }

    const body = (await request.json()) as {
      items?: SaleItemInput[];
      payments?: PaymentInput[];
      notes?: string;
    };
    if (!body.items?.length || !body.payments?.length) {
      return NextResponse.json({ error: "La venta necesita productos y pagos." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("register_sale", {
      p_store_id: profile.store_id,
      p_items: body.items,
      p_payments: body.payments,
      p_notes: body.notes || null,
    });
    if (error) throw error;
    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
