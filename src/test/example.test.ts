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
    expect(calculations.total_volume_kg).toBeCloseTo(35_960_568.157, 3);
    expect(calculations.revenue_milk_total).toBeCloseTo(1_349_403_062.16, 2);
    expect(calculations.cost_milk_total).toBeCloseTo(1_476_388_096.11, 2);
    expect(calculations.revenue_milk_total - calculations.cost_milk_total).toBeCloseTo(
      -126_985_033.95,
      2,
    );
  });

  it("uses the confirmed September and October milk inputs", () => {
    const calculations = calculate(useModel.getState());
    const september = calculations.monthly[8];
    const october = calculations.monthly[9];
    const novemberDecember = calculations.monthly.slice(10, 12);

    expect(september.daily).toBeCloseTo(96_935, 6);
    expect(september.volume).toBeCloseTo(2_908_050, 2);
    expect(september.price).toBeCloseTo(35.38, 8);
    expect(september.effective_price).toBeCloseTo(35.38, 8);
    expect(october.daily).toBeCloseTo(2_953_000 / 31, 6);
    expect(october.volume).toBeCloseTo(2_953_000, 2);
    expect(october.price).toBeCloseTo(36.35, 8);
    expect(october.fat).toBeCloseTo(3.8, 8);
    expect(october.fat_premium).toBeCloseTo((3.8 - 3.6) * 5.5, 8);
    expect(october.effective_price).toBeCloseTo(37.45, 8);
    expect(calculations.total_volume_kg).toBeCloseTo(35_960_568.157, 3);

    novemberDecember.forEach((month) => {
      expect(month.price).toBe(36);
      expect(month.fat).toBe(4);
      expect(month.fat_premium).toBeCloseTo((4 - 3.6) * 5.5, 8);
      expect(month.effective_price).toBeCloseTo(38.2, 8);
    });
  });
});
