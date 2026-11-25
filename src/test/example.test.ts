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
    expect(calculations.revenue_milk_total).toBeCloseTo(1_359_646_377.02, 2);
    expect(calculations.cost_milk_total).toBeCloseTo(1_476_388_096.11, 2);
    expect(calculations.revenue_milk_total - calculations.cost_milk_total).toBeCloseTo(
      -116_741_719.09,
      2,
    );
  });

  it("uses the confirmed September through December milk inputs", () => {
    const calculations = calculate(useModel.getState());
    const september = calculations.monthly[8];
    const october = calculations.monthly[9];
    const [november, december] = calculations.monthly.slice(10, 12);

    expect(september.daily).toBeCloseTo(96_935, 6);
    expect(september.volume).toBeCloseTo(2_908_050, 2);
    expect(september.price).toBeCloseTo(35.38, 8);
    expect(september.effective_price).toBeCloseTo(35.38, 8);
    expect(october.daily).toBeCloseTo(2_953_000 / 31, 6);
    expect(october.volume).toBeCloseTo(2_953_000, 2);
    expect(october.price).toBeCloseTo(36, 10);
    expect(october.fat).toBeCloseTo(3.8, 8);
    expect(october.fat_premium).toBeCloseTo(2.3757551168, 10);
    expect(october.effective_price).toBeCloseTo(38.3757551168, 10);
    expect(october.revenue_milk).toBeCloseTo(113_323_604.86, 2);
    expect(calculations.total_volume_kg).toBeCloseTo(35_960_568.157, 3);

    expect(november.price).toBe(36.53);
    expect(november.effective_price).toBeCloseTo(38.73, 8);
    expect(december.price).toBe(38);
    expect(december.effective_price).toBeCloseTo(40.20, 8);
    [november, december].forEach((month) => {
      expect(month.fat).toBe(4);
      expect(month.fat_premium).toBeCloseTo((4 - 3.6) * 5.5, 8);
    });
  });
});
