import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";
import type { ProductInput } from "@/lib/types";

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    const privileged = profile.role === "admin" || profile.role === "stock";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("page_size") || 200)));
    const search = (request.nextUrl.searchParams.get("search") || "").trim().replace(/[,()]/g, " ");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const columns = privileged
      ? "id,code,barcode,name,category,unit,unit_measure_id,sale_price_usd,stock_quantity,minimum_stock,active,product_costs(purchase_price_usd),unit_measures(allows_decimals)"
      : "id,code,barcode,name,category,unit,unit_measure_id,sale_price_usd,stock_quantity,minimum_stock,active,unit_measures(allows_decimals)";

    let query = supabase
      .from("products")
      .select(columns, { count: "exact" })
      .eq("store_id", profile.store_id)
      .eq("active", true)
      .order("name")
      .range(from, to);

    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`name.ilike.${pattern},code.ilike.${pattern},barcode.ilike.${pattern},category.ilike.${pattern}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const products = rows.map((row) => {
      const costRelation = row.product_costs as { purchase_price_usd?: number | string } | Array<{ purchase_price_usd?: number | string }> | undefined;
      const cost = Array.isArray(costRelation) ? costRelation[0]?.purchase_price_usd : costRelation?.purchase_price_usd;
      const unitRelation = row.unit_measures as { allows_decimals?: boolean } | Array<{ allows_decimals?: boolean }> | undefined;
      const unit = Array.isArray(unitRelation) ? unitRelation[0] : unitRelation;
      const { product_costs: _costs, unit_measures: _units, ...clean } = row;
      return {
        ...clean,
        sale_price_usd: numeric(row.sale_price_usd),
        stock_quantity: numeric(row.stock_quantity),
        minimum_stock: numeric(row.minimum_stock),
        allows_decimals: Boolean(unit?.allows_decimals),
        ...(privileged ? { purchase_price_usd: numeric(cost) } : {}),
      };
    });

    return NextResponse.json({
      data: products,
      profile,
      pagination: { page, page_size: pageSize, total: count ?? products.length, pages: Math.max(1, Math.ceil((count ?? products.length) / pageSize)) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(profile.role === "admin" || profile.role === "stock")) {
      return NextResponse.json({ error: "No tiene permiso para administrar productos." }, { status: 403 });
    }

    const body = (await request.json()) as ProductInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }
    const code = body.code?.trim().toUpperCase() || "";
    if (code && !/^[A-Z0-9]{1,6}$/.test(code)) {
      return NextResponse.json({ error: "El código manual admite hasta 6 letras o números." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("upsert_product", {
      p_store_id: profile.store_id,
      p_code: code,
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
