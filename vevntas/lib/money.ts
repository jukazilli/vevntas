export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function usdToVes(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

export function vesToUsd(ves: number, rate: number): number {
  if (rate <= 0) return 0;
  return Math.round((ves / rate) * 100) / 100;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatVes(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(value);
}
