import { describe, expect, it } from "vitest";
import { extractBcvRateFromHtml } from "@/lib/exchange-rate";

describe("BCV parser", () => {
  it("extracts the official USD value from the BCV block", () => {
    const html = '<div id="dolar"><div><strong>748,62970000</strong></div></div>';
    expect(extractBcvRateFromHtml(html)).toBeCloseTo(748.6297);
  });
});
