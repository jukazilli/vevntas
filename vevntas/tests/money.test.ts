import { describe, expect, it } from "vitest";
import { usdToVes, vesToUsd } from "@/lib/money";

describe("currency conversion", () => {
  it("converts USD to VES with two decimals", () => {
    expect(usdToVes(10, 36.5)).toBe(365);
    expect(usdToVes(1.234, 36.5)).toBe(45.04);
  });

  it("converts VES to USD safely", () => {
    expect(vesToUsd(365, 36.5)).toBe(10);
    expect(vesToUsd(100, 0)).toBe(0);
  });
});
