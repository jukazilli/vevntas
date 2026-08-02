export const DEFAULT_EXCHANGE_RATE_API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

const MAX_ALLOWED_RATE = 1_000_000_000;
const RATE_FIELDS = ["promedio", "venta", "compra", "rate", "valor", "precio", "price"] as const;
const DATE_FIELDS = [
  "fechaActualizacion",
  "fecha_actualizacion",
  "ultimaActualizacion",
  "updated_at",
  "updatedAt",
  "fecha",
  "date",
] as const;

type ProviderRecord = Record<string, unknown>;

export type OfficialExchangeRate = {
  rate: number;
  source: string;
  referenceAt: string;
  fetchedAt: string;
  providerUrl: string;
};

function asRecord(value: unknown): ProviderRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ProviderRecord)
    : null;
}

export function parseRateNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 && value < MAX_ALLOWED_RATE ? value : null;
  }

  if (typeof value !== "string") return null;

  const compact = value.trim().replace(/\s/g, "");
  if (!compact) return null;

  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "");
  } else if (comma >= 0) {
    normalized = compact.replace(",", ".");
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 && parsed < MAX_ALLOWED_RATE ? parsed : null;
}

function selectProviderRecord(payload: unknown): ProviderRecord {
  const direct = asRecord(payload);
  if (direct) return direct;

  if (Array.isArray(payload)) {
    const records = payload.map(asRecord).filter((item): item is ProviderRecord => Boolean(item));
    const official = records.find((item) => {
      const label = `${item.nombre ?? ""} ${item.fuente ?? ""}`.toLowerCase();
      return label.includes("oficial") || label.includes("bcv");
    });
    if (official) return official;
    if (records[0]) return records[0];
  }

  throw new Error("El proveedor devolvió un formato de cotización no reconocido.");
}

export function normalizeExchangeRatePayload(
  payload: unknown,
  providerUrl = DEFAULT_EXCHANGE_RATE_API_URL,
  now = new Date(),
): OfficialExchangeRate {
  const record = selectProviderRecord(payload);
  const rate = RATE_FIELDS.map((field) => parseRateNumber(record[field])).find((value) => value !== null);

  if (rate == null) {
    throw new Error("El proveedor no devolvió una tasa USD/VES válida.");
  }

  const rawDate = DATE_FIELDS.map((field) => record[field]).find(
    (value) => typeof value === "string" || typeof value === "number",
  );
  const parsedDate = rawDate == null ? null : new Date(rawDate as string | number);
  const referenceAt = parsedDate && Number.isFinite(parsedDate.getTime())
    ? parsedDate.toISOString()
    : now.toISOString();

  const providerName = [record.fuente, record.nombre]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" · ");

  return {
    rate: Number(rate.toFixed(6)),
    source: providerName || "DolarAPI · Oficial",
    referenceAt,
    fetchedAt: now.toISOString(),
    providerUrl,
  };
}

export async function fetchOfficialExchangeRate(): Promise<OfficialExchangeRate> {
  const providerUrl = process.env.EXCHANGE_RATE_API_URL?.trim() || DEFAULT_EXCHANGE_RATE_API_URL;
  const response = await fetch(providerUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Vevntas/1.0 (+https://vevntas.vercel.app)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`El proveedor de cotización respondió HTTP ${response.status}.`);
  }

  return normalizeExchangeRatePayload(await response.json(), providerUrl);
}
