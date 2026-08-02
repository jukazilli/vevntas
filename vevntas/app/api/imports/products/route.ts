import { NextRequest, NextResponse } from "next/server";
import { requireUserAndProfile } from "@/lib/supabase/server";
import type { ProductInput } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile } = await requireUserAndProfile(request);
    if (!(["admin", "stock"] as string[]).includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permiso para importar productos." }, { status: 403 });
    }

    const body = (await request.json()) as {
      file_name?: string;
      update_stock?: boolean;
      rows?: ProductInput[];
    };
    if (!body.file_name?.trim() || !body.rows?.length) {
      return NextResponse.json({ error: "Archivo y filas son obligatorios." }, { status: 400 });
    }
    if (body.rows.length > 5000) {
      return NextResponse.json({ error: "La importación admite hasta 5.000 filas." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("import_products", {
      p_store_id: profile.store_id,
      p_file_name: body.file_name,
      p_rows: body.rows,
      p_update_stock: Boolean(body.update_stock),
    });
    if (error) throw error;
    return NextResponse.json({ data: { batch_id: data } }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
