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
    expect(calculations.total_volume_kg).toBeCloseTo(35_960_568.017, 3);
  });

  it("uses the confirmed September and October volumes and Q4 fat premium formula", () => {
    const calculations = calculate(useModel.getState());
    const september = calculations.monthly[8];
    const october = calculations.monthly[9];
    const q4 = calculations.monthly.slice(9, 12);

    expect(september.daily).toBeCloseTo(96_935, 6);
    expect(september.volume).toBeCloseTo(2_908_050, 2);
    expect(october.daily).toBeCloseTo(95_258.06, 6);
    expect(october.volume).toBeCloseTo(2_952_999.86, 2);
    expect(calculations.total_volume_kg).toBeCloseTo(35_960_568.017, 3);

    q4.forEach((month) => {
      expect(month.price).toBe(36);
      expect(month.fat).toBe(4);
      expect(month.fat_premium).toBeCloseTo((4 - 3.6) * 5.5, 8);
      expect(month.effective_price).toBeCloseTo(38.2, 8);
    });
  });
});
