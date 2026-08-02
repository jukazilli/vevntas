import { describe, expect, it } from "vitest";
import { normalizeExchangeRatePayload, parseRateNumber } from "@/lib/exchange-rate";

describe("exchange rate provider normalization", () => {
  it("parses numeric and localized values", () => {
    expect(parseRateNumber(145.123456)).toBe(145.123456);
    expect(parseRateNumber("145,25")).toBe(145.25);
    expect(parseRateNumber("1.245,80 VES")).toBe(1245.8);
  });

  it("normalizes an official provider payload", () => {
    const result = normalizeExchangeRatePayload(
      {
        fuente: "BCV",
        nombre: "Oficial",
        promedio: 145.1234567,
        fechaActualizacion: "2026-08-02T12:00:00.000Z",
      },
      "https://provider.test/oficial",
      new Date("2026-08-02T13:00:00.000Z"),
    );

    expect(result).toEqual({
      rate: 145.123457,
      source: "BCV · Oficial",
      referenceAt: "2026-08-02T12:00:00.000Z",
      fetchedAt: "2026-08-02T13:00:00.000Z",
      providerUrl: "https://provider.test/oficial",
    });
  });

  it("selects the official record from an array", () => {
    const result = normalizeExchangeRatePayload([
      { nombre: "Paralelo", promedio: 160 },
      { nombre: "Oficial", fuente: "BCV", promedio: 145 },
    ]);
    expect(result.rate).toBe(145);
    expect(result.source).toBe("BCV · Oficial");
  });
});
