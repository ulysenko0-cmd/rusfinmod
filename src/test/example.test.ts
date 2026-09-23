import { describe, it, expect } from "vitest";
import { calculate, useModel } from "@/store/model";

describe("milk model defaults", () => {
  it("uses the confirmed August volume and price with fat premium", () => {
    const calculations = calculate(useModel.getState());
    const august = calculations.monthly[7];

    expect(august.volume).toBeCloseTo(3_131_856, 6);
    expect(august.fat).toBe(3.765);
    expect(august.fat_premium).toBeCloseTo(0.33, 10);
    expect(august.effective_price).toBeCloseTo(35.33, 10);
    expect(calculations.total_volume_kg).toBeCloseTo(35_979_918.157, 3);
  });
});
