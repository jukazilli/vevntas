import { describe, expect, it } from "vitest";
import { lineTotal, parseLocaleNumber, truncMoney, usdToVes } from "@/lib/money";

describe("money helpers", () => {
  it("parses Venezuelan and international decimal formats", () => {
    expect(parseLocaleNumber("7.938,9883")).toBeCloseTo(7938.9883);
    expect(parseLocaleNumber("7938.9883")).toBeCloseTo(7938.9883);
    expect(parseLocaleNumber("12,834")).toBeCloseTo(12.834);
  });

  it("truncates accounting values instead of rounding sales", () => {
    expect(lineTotal(12.834, 7938.9883)).toBe(101888.97);
    expect(truncMoney(10.999)).toBe(10.99);
    expect(usdToVes(12.834, 7938.9883)).toBe(101888.97);
  });
});
