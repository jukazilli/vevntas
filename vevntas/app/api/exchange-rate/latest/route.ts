import { NextResponse } from "next/server";
import { fetchOfficialExchangeRate } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quote = await fetchOfficialExchangeRate();
    return NextResponse.json({
      data: {
        rate: quote.rate,
        source: quote.source,
        reference_at: quote.referenceAt,
        fetched_at: new Date().toISOString(),
        is_manual: false,
      },
    }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible consultar el BCV." }, { status: 502 });
  }
}
