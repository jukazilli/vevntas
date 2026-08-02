import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(profile.role === "admin" || profile.role === "stock")) {
      return NextResponse.json({ error: "No tiene permiso para consultar el inventario." }, { status: 403 });
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get("page_size") || 20)));
    const search = (request.nextUrl.searchParams.get("search") || "").trim().replace(/[,()]/g, " ");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("products")
      .select("id,code,barcode,name,category,unit,unit_measure_id,sale_price_usd,stock_quantity,minimum_stock,active,product_costs(purchase_price_usd,updated_at),unit_measures(allows_decimals)", { count: "exact" })
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("name")
      .range(from, to);

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`name.ilike.${pattern},code.ilike.${pattern},barcode.ilike.${pattern}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const products = rows.map((row) => {
      const costRelation = row.product_costs as { purchase_price_usd?: number | string; updated_at?: string } | Array<{ purchase_price_usd?: number | string; updated_at?: string }> | undefined;
      const cost = Array.isArray(costRelation) ? costRelation[0] : costRelation;
      const unitRelation = row.unit_measures as { allows_decimals?: boolean } | Array<{ allows_decimals?: boolean }> | undefined;
      const unit = Array.isArray(unitRelation) ? unitRelation[0] : unitRelation;
      const { product_costs: _costs, unit_measures: _units, ...clean } = row;
      return {
        ...clean,
        sale_price_usd: Number(row.sale_price_usd),
        stock_quantity: Number(row.stock_quantity),
        minimum_stock: Number(row.minimum_stock),
        purchase_price_usd: Number(cost?.purchase_price_usd ?? 0),
        last_purchase_at: cost?.updated_at ?? null,
        allows_decimals: Boolean(unit?.allows_decimals),
      };
    });

    return NextResponse.json({
      data: products,
      pagination: { page, page_size: pageSize, total: count ?? products.length, pages: Math.max(1, Math.ceil((count ?? products.length) / pageSize)) },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
