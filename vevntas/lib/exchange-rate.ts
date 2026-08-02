import { parseLocaleNumber } from "@/lib/money";

export type OfficialExchangeRate = {
  rate: number;
  source: string;
  referenceAt: string;
};

const BCV_URL = process.env.BCV_EXCHANGE_RATE_URL?.trim() || "https://www.bcv.org.ve/";
const FALLBACK_URL = process.env.EXCHANGE_RATE_FALLBACK_URL?.trim() || "https://ve.dolarapi.com/v1/dolares/oficial";
const TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "Vevntas/1.0 (+https://vevntas.vercel.app)",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function extractBcvRateFromHtml(html: string): number {
  const dollarBlock = html.match(/<div[^>]+id=["']dolar["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1]
    ?? html.match(/id=["']dolar["'][\s\S]{0,1200}/i)?.[0]
    ?? "";
  const strongValue = dollarBlock.match(/<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i)?.[1]
    ?? dollarBlock.match(/([0-9]{1,4}(?:[.,][0-9]{2,6}))/)?.[1];
  const rate = parseLocaleNumber(strongValue);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("No fue posible leer la tasa USD del sitio del BCV.");
  }
  return rate;
}

function extractReferenceDate(html: string): string {
  const dateText = html.match(/<span[^>]+class=["'][^"']*date-display-single[^"']*["'][^>]*>([^<]+)<\/span>/i)?.[1]
    ?? html.match(/Fecha Valor[^0-9]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i)?.[1];
  if (!dateText) return new Date().toISOString();

  const parts = dateText.trim().match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!parts) return new Date().toISOString();
  return new Date(Date.UTC(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]), 4)).toISOString();
}

async function fetchFromBcv(): Promise<OfficialExchangeRate> {
  const response = await fetchWithTimeout(BCV_URL);
  if (!response.ok) throw new Error(`BCV respondió HTTP ${response.status}.`);
  const html = await response.text();
  return {
    rate: extractBcvRateFromHtml(html),
    source: "BCV · Banco Central de Venezuela",
    referenceAt: extractReferenceDate(html),
  };
}

async function fetchFromFallback(): Promise<OfficialExchangeRate> {
  const response = await fetchWithTimeout(FALLBACK_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Proveedor alterno respondió HTTP ${response.status}.`);
  const payload = (await response.json()) as Record<string, unknown>;
  const rate = Number(payload.promedio ?? payload.price ?? payload.rate ?? payload.valor);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("El proveedor alterno devolvió una tasa inválida.");
  const referenceAt = String(payload.fechaActualizacion ?? payload.updatedAt ?? payload.date ?? new Date().toISOString());
  return {
    rate,
    source: "BCV · proveedor alterno verificado",
    referenceAt: new Date(referenceAt).toString() === "Invalid Date" ? new Date().toISOString() : new Date(referenceAt).toISOString(),
  };
}

export async function fetchOfficialExchangeRate(): Promise<OfficialExchangeRate> {
  const errors: string[] = [];
  try {
    return await fetchFromBcv();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Error BCV");
  }

  try {
    return await fetchFromFallback();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Error proveedor alterno");
  }

  throw new Error(`No fue posible consultar la tasa oficial. ${errors.join(" ")}`);
}
