const MONEY_FACTOR = 100;

export function parseLocaleNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const compact = raw.replace(/\s/g, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;

  if (comma >= 0 && dot >= 0) {
    const decimalIndex = Math.max(comma, dot);
    const integer = compact.slice(0, decimalIndex).replace(/[.,]/g, "");
    const decimal = compact.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${integer}.${decimal}`;
  } else if (comma >= 0) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized.replace(/[^0-9+\-.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toNumber(value: unknown): number {
  return parseLocaleNumber(value);
}

export function truncMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc((value + Number.EPSILON) * MONEY_FACTOR) / MONEY_FACTOR;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * MONEY_FACTOR) / MONEY_FACTOR;
}

export function usdToVes(usd: number, rate: number): number {
  return truncMoney(usd * rate);
}

export function vesToUsd(ves: number, rate: number): number {
  if (rate <= 0) return 0;
  return truncMoney(ves / rate);
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return truncMoney(quantity * unitPrice);
}

export function formatQuantity(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatVes(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
