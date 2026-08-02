import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";
import type { ProductInput } from "@/lib/types";

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    const privileged = profile.role === "admin" || profile.role === "stock";

    let query = supabase
      .from("products")
      .select(privileged
        ? "id,code,barcode,name,category,unit,sale_price_usd,stock_quantity,minimum_stock,active,product_costs(purchase_price_usd)"
        : "id,code,barcode,name,category,unit,sale_price_usd,stock_quantity,minimum_stock,active")
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("name");

    const { data, error } = await query;
    if (error) throw error;

    const products = (data ?? []).map((row: Record<string, unknown>) => {
      const relation = row.product_costs as { purchase_price_usd?: number | string } | { purchase_price_usd?: number | string }[] | undefined;
      const cost = Array.isArray(relation) ? relation[0]?.purchase_price_usd : relation?.purchase_price_usd;
      return {
        ...row,
        sale_price_usd: Number(row.sale_price_usd),
        stock_quantity: Number(row.stock_quantity),
        minimum_stock: Number(row.minimum_stock),
        ...(privileged ? { purchase_price_usd: Number(cost ?? 0) } : {}),
        product_costs: undefined,
      };
    });

    return NextResponse.json({ data: products, profile });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(["admin", "stock"] as string[]).includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permiso para administrar productos." }, { status: 403 });
    }

    const body = (await request.json()) as ProductInput;
    if (!body.code?.trim() || !body.name?.trim()) {
      return NextResponse.json({ error: "Código y nombre son obligatorios." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("upsert_product", {
      p_store_id: profile.store_id,
      p_code: body.code,
      p_name: body.name,
      p_sale_price_usd: Number(body.sale_price_usd),
      p_purchase_price_usd: Number(body.purchase_price_usd),
      p_barcode: body.barcode || null,
      p_category: body.category || null,
      p_unit: body.unit || "UNIDAD",
      p_minimum_stock: Number(body.minimum_stock ?? 0),
      p_stock_quantity: body.stock_quantity == null ? null : Number(body.stock_quantity),
    });
    if (error) throw error;

    return NextResponse.json({ data: { id: data } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
