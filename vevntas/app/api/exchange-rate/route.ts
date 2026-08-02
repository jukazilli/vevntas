import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialExchangeRate, type OfficialExchangeRate } from "@/lib/exchange-rate";
import { requireUserAndProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RATE_COLUMNS = "rate,source,reference_at,fetched_at,is_manual";
const DEFAULT_REFRESH_MINUTES = 60;

type StoredRate = {
  rate: number | string;
  source: string;
  reference_at: string | null;
  fetched_at: string | null;
  is_manual: boolean;
};

function refreshIntervalMs(): number {
  const configured = Number(process.env.EXCHANGE_RATE_REFRESH_MINUTES ?? DEFAULT_REFRESH_MINUTES);
  const minutes = Number.isFinite(configured) ? Math.min(Math.max(configured, 15), 1_440) : DEFAULT_REFRESH_MINUTES;
  return minutes * 60_000;
}

function isStale(rate: StoredRate | null): boolean {
  if (!rate) return true;
  const fetchedAt = rate.fetched_at ? new Date(rate.fetched_at).getTime() : 0;
  return !Number.isFinite(fetchedAt) || Date.now() - fetchedAt >= refreshIntervalMs();
}

function normalize(rate: StoredRate | null, mode: "automatic" | "manual") {
  return rate
    ? { ...rate, rate: Number(rate.rate), mode }
    : { rate: null, source: "Sin configurar", reference_at: null, fetched_at: null, is_manual: mode === "manual", mode };
}

async function latestByType(
  supabase: Awaited<ReturnType<typeof requireUserAndProfile>>["supabase"],
  storeId: string,
  manual: boolean,
): Promise<StoredRate | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select(RATE_COLUMNS)
    .eq("store_id", storeId)
    .eq("is_manual", manual)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as StoredRate | null) ?? null;
}

function validateAutomaticChange(current: StoredRate | null, quote: OfficialExchangeRate) {
  if (!current) return;
  const currentValue = Number(current.rate);
  const currentAge = current.fetched_at ? Date.now() - new Date(current.fetched_at).getTime() : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(currentValue) || currentValue <= 0 || currentAge > 24 * 60 * 60 * 1_000) return;
  const ratio = quote.rate / currentValue;
  if (ratio < 0.65 || ratio > 1.35) {
    throw new Error("La nueva cotización varía más de 35% frente a la tasa automática vigente y fue bloqueada por seguridad.");
  }
}

async function insertAutomaticRate(
  supabase: Awaited<ReturnType<typeof requireUserAndProfile>>["supabase"],
  storeId: string,
  userId: string,
  current: StoredRate | null,
) {
  const quote = await fetchOfficialExchangeRate();
  validateAutomaticChange(current, quote);
  const { data, error } = await supabase
    .from("exchange_rates")
    .insert({
      store_id: storeId,
      rate: quote.rate,
      source: quote.source,
      reference_at: quote.referenceAt,
      is_manual: false,
      created_by: userId,
    })
    .select(RATE_COLUMNS)
    .single();
  if (error) throw error;
  return data as StoredRate;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, profile, user } = await requireUserAndProfile(request);
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("exchange_rate_mode")
      .eq("id", profile.store_id)
      .single();
    if (storeError) throw storeError;
    const mode = (store?.exchange_rate_mode === "manual" ? "manual" : "automatic") as "automatic" | "manual";

    let automatic = await latestByType(supabase, profile.store_id, false);
    const manual = await latestByType(supabase, profile.store_id, true);
    let refreshError: string | null = null;
    let refreshed = false;

    if (mode === "automatic" && profile.role === "admin" && isStale(automatic)) {
      try {
        automatic = await insertAutomaticRate(supabase, profile.store_id, user.id, automatic);
        refreshed = true;
      } catch (error) {
        refreshError = error instanceof Error ? error.message : "No fue posible actualizar la cotización oficial.";
      }
    }

    const selected = mode === "manual" ? manual ?? automatic : automatic ?? manual;
    return NextResponse.json({
      data: normalize(selected, mode),
      automatic_refresh: { enabled: mode === "automatic", refreshed, stale: isStale(automatic), warning: refreshError },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, profile, user } = await requireUserAndProfile(request);
    if (profile.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede configurar la tasa." }, { status: 403 });
    const body = (await request.json()) as { mode?: "auto" | "manual"; rate?: number; source?: string; reference_at?: string };

    if (body.mode === "auto") {
      const current = await latestByType(supabase, profile.store_id, false);
      try {
        const data = await insertAutomaticRate(supabase, profile.store_id, user.id, current);
        return NextResponse.json({ data: normalize(data, "automatic") }, { status: 201 });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la cotización." }, { status: 502 });
      }
    }

    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate <= 0) return NextResponse.json({ error: "La tasa debe ser mayor que cero." }, { status: 400 });
    const { data, error } = await supabase
      .from("exchange_rates")
      .insert({
        store_id: profile.store_id,
        rate,
        source: body.source?.trim() || "MANUAL",
        reference_at: body.reference_at || new Date().toISOString(),
        is_manual: true,
        created_by: user.id,
      })
      .select(RATE_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ data: normalize(data as StoredRate, "manual") }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500 });
  }
}
