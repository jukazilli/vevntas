import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "vevntas",
      database: new URL(SUPABASE_URL).hostname,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
