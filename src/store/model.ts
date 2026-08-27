// Финмодель «Русь 2026» — централизованный store + расчёты
// Все формулы реализованы согласно спецификации.

import { create } from "zustand";

// --- Константы ---
export const MONTHS = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
] as const;

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// 6 категорий мяса
export const MEAT_CATEGORIES = [
  { key: "krs_slaughter", name: "КРС (колбасный цех) через убой", note: "Убой, мясо сдаётся в кг" },
  { key: "rm_slaughter",  name: "РМ (колбасный цех) через убой", note: "Разновозрастной молодняк" },
  { key: "krs_live",      name: "КРС в живом весе (живком)", note: "Продажа живьём" },
  { key: "rm_live",       name: "РМ в живом весе (живком)", note: "Продажа живьём" },
  { key: "bulls",         name: "Бычки", note: "Молодняк на откорм/продажу" },
  { key: "heifers",       name: "Нетели (племенной скот)", note: "Племенные нетели, высокая цена" },
] as const;

export type MeatKey = typeof MEAT_CATEGORIES[number]["key"];

// --- Типы ---
export interface MeatRow {
  heads: number;            // голов
  weight_per_head: number;  // кг/гол (вес одной головы)
  price_2025: number;       // руб/кг
  cost_2025: number;        // руб/кг
}

export interface ModelState {
  // Молоко: помесячно
  price_milk_m: number[];        // 12 месяцев — базовая цена
  daily_volume_m: number[];      // 12 месяцев
  fat_m: number[];               // 12 месяцев — жир, %
  fat_base: number;              // база надбавки по договору (3.6%)
  fat_premium_per_pct: number;   // ₽/кг за 1% жира сверх базы (2.0)

  // СС молока
  cost_milk_2025: number;
  cost_milk_coeff: number;

  // Мясо
  meat: Record<MeatKey, MeatRow>;
  revenue_meat_coeff: number;
  cost_meat_coeff: number;

  // Прочее
  subsidies_2026_total: number;
  // Прочие доходы — детализация по статьям (₽/год)
  other_revenue_items: {
    sale_os: number;            // Продажа ОС
    insurance: number;          // Страховое возмещение
    other: number;              // Прочие
  };
  // Прочие расходы 2025 — детализация по статьям (₽/год)
  other_costs_items: {
    mastit_milk: number;       // Списание маст. молока
    sale_os: number;           // Продажа ОС
    credit_percent: number;    // % кредит
    feed_loss: number;         // Потери корма
    crops_loss: number;        // Потери (гибель посевов)
    other: number;             // Прочие
  };
  inflation_other_coeff: number;
  oxr_2025: number;

  // Инвестиции
  invest_1_fixed_assets: number;
  invest_2_young_cattle: number;
  invest_3_credit: number;

  // Расчёт Инвест 1 (детализация)
  invest1_leasing_no_vat: number;
  invest1_planned_purchase_with_vat: number;
  invest1_vat_coeff: number;            // делитель для перевода с НДС → без НДС (1.22)
  invest1_amortization_os: number;

  // Расчёт Инвест 2 (молодняк)
  invest2_young_costs: number;        // Затраты на содержание молодняка
  invest2_writeoff_current: number;   // Списание затрат в текущем периоде

  // Источник значений для блока «Инвестиционная составляющая»
  invest_1_source: "calc" | "manual";
  invest_2_source: "calc" | "manual";

  // Сравнение — факт 2025 (для моста)
  fact_2025: {
    volume_kg: number;
    price_milk: number;          // средняя руб/кг
    cost_milk: number;           // руб/кг
    revenue_meat_total: number;
    cost_meat_total: number;
    subsidies: number;
    other_revenue: number;
    other_costs_total: number;   // прочие + ОХР, руб
    result_production: number;
  };

  // Setters
  setPriceMilk: (i: number, v: number) => void;
  setDailyVolume: (i: number, v: number) => void;
  setFat: (i: number, v: number) => void;
  setField: <K extends keyof ModelState>(k: K, v: ModelState[K]) => void;
  setMeatField: (cat: MeatKey, field: keyof MeatRow, v: number) => void;
  reset: () => void;
}

// --- Дефолтные значения из спецификации ---
const DEFAULT_PRICE_MILK = [41.5, 39.5, 37, 37, 37, 35.63, 35, 35, 35, 35, 35, 35];
const DEFAULT_DAILY_VOLUME = [
  93761.129, 95282.857, 96367.742, 100050, 103800, 104631.94,
  102164.16, 96400, 96400, 96400, 96400, 96400,
];

// Сверено с эталонным Excel-файлом «Мини-модель_мясо_2026»
// weight_per_head = volume_kg / heads (исходные данные)
const DEFAULT_MEAT: Record<MeatKey, MeatRow> = {
  krs_slaughter: { heads: 164,    weight_per_head: 540,         price_2025: 105.8956, cost_2025: 208.1284 },
  rm_slaughter:  { heads: 258,    weight_per_head: 260.315543,   price_2025: 105.8956, cost_2025: 412.5470 },
  krs_live:      { heads: 1206,   weight_per_head: 540,          price_2025: 141.3974, cost_2025: 163.6634 },
  rm_live:       { heads: 258.63, weight_per_head: 259.679608,   price_2025: 131.1914, cost_2025: 369.7174 },
  bulls:         { heads: 1727.2, weight_per_head: 55.749653,    price_2025: 214.7618, cost_2025: 369.7174 },
  heifers:       { heads: 544,    weight_per_head: 567.791176,   price_2025: 357.3581, cost_2025: 369.7174 },
};

const DEFAULT_FAT = [4.12, 3.97, 3.90, 3.95, 3.77, 3.81, 3.5, 3.61, 3.56, 3.73, 3.83, 4.02];

const DEFAULT_STATE = {
  price_milk_m: [...DEFAULT_PRICE_MILK],
  daily_volume_m: [...DEFAULT_DAILY_VOLUME],
  fat_m: [...DEFAULT_FAT],
  fat_base: 3.6,
  fat_premium_per_pct: 2.0,
  cost_milk_2025: 38.55,
  cost_milk_coeff: 1.065,
  meat: structuredClone(DEFAULT_MEAT),
  revenue_meat_coeff: 1.05,
  cost_meat_coeff: 1.065,
  subsidies_2026_total: 126_000_000,
  other_revenue_items: {
    sale_os: 10_780_000,
    insurance: 12_000_000,
    other: 5_400_000,
  },
  other_costs_items: {
    mastit_milk: 8_100_000,
    sale_os: 5_500_000,
    credit_percent: 9_972_484.38,
    feed_loss: 15_500_000,
    crops_loss: 12_000_000,
    other: 4_200_000,
  },
  inflation_other_coeff: 1.065,
  oxr_2025: 31_461_778.71,
  invest_1_fixed_assets: 70_000_000,
  invest_2_young_cattle: 50_000_000,
  invest_3_credit: 88_612_341,
  invest1_leasing_no_vat: 30_000_000,
  invest1_planned_purchase_with_vat: 50_000_000,
  invest1_vat_coeff: 1.22,
  invest1_amortization_os: 210_000_000,
  invest2_young_costs: 512_000_000,
  invest2_writeoff_current: 450_000_000,
  invest_1_source: "calc" as const,
  invest_2_source: "calc" as const,
  fact_2025: {
    volume_kg: 35_555_149,
    price_milk: 44.52,                // 1 582 915 233.48 / 35 555 149
    cost_milk: 38.55,
    revenue_meat_total: 241_303_517.47,
    cost_meat_total: 305_898_295.84,  // лист «Сравнение»: мясо + племпродажа СС
    subsidies: 125_003_628.55,
    other_revenue: 28_122_896.86,
    other_costs_total: 86_491_397.70, // прочие 55 029 618.99 + ОХР 31 461 778.71
    result_production: 214_304_588.87,
  },
};

export const useModel = create<ModelState>((set) => ({
  ...DEFAULT_STATE,
  setPriceMilk: (i, v) => set((s) => {
    const arr = [...s.price_milk_m]; arr[i] = v; return { price_milk_m: arr };
  }),
  setDailyVolume: (i, v) => set((s) => {
    const arr = [...s.daily_volume_m]; arr[i] = v; return { daily_volume_m: arr };
  }),
  setFat: (i, v) => set((s) => {
    const arr = [...s.fat_m]; arr[i] = v; return { fat_m: arr };
  }),
  setField: (k, v) => set({ [k]: v } as Partial<ModelState>),
  setMeatField: (cat, field, v) => set((s) => ({
    meat: { ...s.meat, [cat]: { ...s.meat[cat], [field]: v } },
  })),
  reset: () => set(DEFAULT_STATE as Partial<ModelState>),
}));

// --- Расчёты (чистые функции, удобно тестировать) ---

export interface MonthlyCalc {
  month: string;
  days: number;
  price: number;            // базовая цена
  fat: number;              // жир, %
  fat_premium: number;      // надбавка ₽/кг
  effective_price: number;  // цена с надбавкой
  daily: number;
  volume: number;
  revenue_milk: number;
  revenue_per_kg: number;
  cost_per_kg: number;
  margin_per_kg: number;
  result: number;
}

export interface MeatCalc {
  key: MeatKey;
  name: string;
  heads: number;
  volume_kg: number;
  price_2025: number;
  price_2026: number;
  price_per_head: number;
  revenue: number;
  cost_2025: number;
  cost_2026: number;
  cost_total: number;
  result: number;
  weight_per_head: number;
}

export interface Calculations {
  // Молоко помесячно
  monthly: MonthlyCalc[];
  total_volume_kg: number;
  revenue_milk_total: number;
  fat_premium_total: number;  // суммарная надбавка за жир за год, ₽

  // СС молока
  cost_milk_2026: number;
  cost_milk_total: number;

  // Мясо
  meatRows: MeatCalc[];
  revenue_meat_total: number;
  cost_meat_total: number;
  result_meat_total: number;
  revenue_meat_per_kg: number;
  cost_meat_per_kg: number;

  // Прочее
  subsidies_per_kg: number;
  other_revenue_total: number;
  other_revenue_per_kg: number;
  other_costs_2025_total: number;   // сумма статей за 2025, ₽
  other_costs_2025_per_kg: number;  // ₽/кг (сумма / объём 2025)
  other_costs_2026: number;         // ₽/кг
  oxr_2026: number;
  oxr_per_kg: number;
  total_other_costs_money: number;  // прочие_расходы * объём + ОХР

  // Итоги
  avg_revenue_per_kg: number;
  avg_cost_per_kg: number;
  result_milk: number;          // Σ result_m
  result_production: number;
  total_investments: number;
  invest_1_fixed_assets_calc: number;
  invest_2_young_cattle_calc: number;
  result_after_invest: number;

  // Факторный анализ
  factors: { name: string; value: number }[];
}

export function calculate(s: ModelState): Calculations {
  // Помесячно — объёмы + надбавка за жир
  const monthlyBase = s.price_milk_m.map((price, i) => {
    const days = DAYS_IN_MONTH[i];
    const daily = s.daily_volume_m[i];
    const volume = daily * days;
    const fat = s.fat_m[i];
    const fat_premium = Math.max(0, (fat - s.fat_base) * s.fat_premium_per_pct);
    const effective_price = price + fat_premium;
    const revenue_milk = effective_price * volume;
    return { i, price, fat, fat_premium, effective_price, daily, days, volume, revenue_milk };
  });
  const total_volume_kg = monthlyBase.reduce((a, m) => a + m.volume, 0);
  const revenue_milk_total = monthlyBase.reduce((a, m) => a + m.revenue_milk, 0);
  const fat_premium_total = monthlyBase.reduce((a, m) => a + m.fat_premium * m.volume, 0);

  // СС молока
  const cost_milk_2026 = s.cost_milk_2025 * s.cost_milk_coeff;
  const cost_milk_total = cost_milk_2026 * total_volume_kg;

  // Мясо — по категориям. Логика: голов × вес/гол = объём кг → × цена/СС
  const meatRows: MeatCalc[] = MEAT_CATEGORIES.map((cat) => {
    const r = s.meat[cat.key];
    const price_2026 = r.price_2025 * s.revenue_meat_coeff;
    const cost_2026 = r.cost_2025 * s.cost_meat_coeff;
    const weight_per_head = r.weight_per_head;
    const volume_kg = r.heads * weight_per_head;
    const price_per_head = price_2026 * weight_per_head;
    const revenue = price_2026 * volume_kg;
    const cost_total = cost_2026 * volume_kg;
    return {
      key: cat.key,
      name: cat.name,
      heads: r.heads,
      volume_kg,
      price_2025: r.price_2025,
      price_2026,
      price_per_head,
      revenue,
      cost_2025: r.cost_2025,
      cost_2026,
      cost_total,
      result: revenue - cost_total,
      weight_per_head,
    };
  });
  const revenue_meat_total = meatRows.reduce((a, m) => a + m.revenue, 0);
  const cost_meat_total = meatRows.reduce((a, m) => a + m.cost_total, 0);
  const result_meat_total = revenue_meat_total - cost_meat_total;
  const revenue_meat_per_kg = total_volume_kg > 0 ? revenue_meat_total / total_volume_kg : 0;
  const cost_meat_per_kg = total_volume_kg > 0 ? cost_meat_total / total_volume_kg : 0;

  // Прочее
  const subsidies_per_kg = total_volume_kg > 0 ? s.subsidies_2026_total / total_volume_kg : 0;
  const other_revenue_total = Object.values(s.other_revenue_items).reduce((a, b) => a + b, 0);
  const other_revenue_per_kg = total_volume_kg > 0 ? other_revenue_total / total_volume_kg : 0;
  // Прочие расходы 2025 = сумма статей, делится на объём 2025 → ₽/кг
  const other_costs_2025_total = Object.values(s.other_costs_items).reduce((a, b) => a + b, 0);
  const other_costs_2025_per_kg = s.fact_2025.volume_kg > 0
    ? other_costs_2025_total / s.fact_2025.volume_kg
    : 0;
  const other_costs_2026 = other_costs_2025_per_kg * s.inflation_other_coeff;
  const oxr_2026 = s.oxr_2025 * s.inflation_other_coeff;
  const oxr_per_kg = total_volume_kg > 0 ? oxr_2026 / total_volume_kg : 0;

  // Помесячный расчёт — выручка/СС на 1 кг (мясо, субсидии, прочие — константы /кг)
  const monthly: MonthlyCalc[] = monthlyBase.map((m) => {
    const revenue_per_kg = m.effective_price + revenue_meat_per_kg + subsidies_per_kg + other_revenue_per_kg;
    const cost_per_kg = cost_milk_2026 + cost_meat_per_kg + other_costs_2026 + oxr_per_kg;
    const margin_per_kg = revenue_per_kg - cost_per_kg;
    return {
      month: MONTHS[m.i],
      days: m.days,
      price: m.price,
      fat: m.fat,
      fat_premium: m.fat_premium,
      effective_price: m.effective_price,
      daily: m.daily,
      volume: m.volume,
      revenue_milk: m.revenue_milk,
      revenue_per_kg,
      cost_per_kg,
      margin_per_kg,
      result: margin_per_kg * m.volume,
    };
  });

  // Помесячный результат уже включает мясо/субсидии/прочее (через /кг),
  // поэтому это и есть общий результат производства, а не только молока.
  const result_milk = monthly.reduce((a, x) => a + x.result, 0);
  const result_production = result_milk;
  const invest1_purchase_no_vat = s.invest1_vat_coeff > 0 ? s.invest1_planned_purchase_with_vat / s.invest1_vat_coeff : 0;
  const invest_1_fixed_assets_calc = s.invest1_leasing_no_vat + invest1_purchase_no_vat - s.invest1_amortization_os;
  const invest_2_young_cattle_calc = s.invest2_young_costs - s.invest2_writeoff_current;
  const invest_1_effective = s.invest_1_source === "manual" ? s.invest_1_fixed_assets : invest_1_fixed_assets_calc;
  const invest_2_effective = s.invest_2_source === "manual" ? s.invest_2_young_cattle : invest_2_young_cattle_calc;
  const total_investments = invest_1_effective + invest_2_effective + s.invest_3_credit;
  const result_after_invest = result_production - total_investments;

  const total_other_costs_money = other_costs_2026 * total_volume_kg + oxr_2026;

  const avg_revenue_per_kg =
    (revenue_milk_total + revenue_meat_total + s.subsidies_2026_total + other_revenue_total) /
    (total_volume_kg || 1);
  const avg_cost_per_kg =
    (cost_milk_total + cost_meat_total + total_other_costs_money) / (total_volume_kg || 1);

  // --- Факторный анализ: мост 2025 → 2026 ---
  const f = s.fact_2025;
  const avg_price_milk_2026 = revenue_milk_total / (total_volume_kg || 1);
  const factors = [
    { name: "Результат 2025 (база)", value: f.result_production },
    { name: "Δ Цена молока",         value: (avg_price_milk_2026 - f.price_milk) * total_volume_kg },
    { name: "Δ Объём молока",        value: (total_volume_kg - f.volume_kg) * (f.price_milk - f.cost_milk) },
    { name: "Δ СС молока",           value: -(cost_milk_2026 - f.cost_milk) * total_volume_kg },
    { name: "Δ Выручка мяса",        value: revenue_meat_total - f.revenue_meat_total },
    { name: "Δ СС мяса",             value: -(cost_meat_total - f.cost_meat_total) },
    { name: "Δ Субсидии",            value: s.subsidies_2026_total - f.subsidies },
    { name: "Δ Прочие доходы",       value: other_revenue_total - f.other_revenue },
    { name: "Δ Прочие расходы + ОХР", value: -(total_other_costs_money - f.other_costs_total) },
  ];

  return {
    monthly,
    total_volume_kg,
    revenue_milk_total,
    fat_premium_total,
    cost_milk_2026,
    cost_milk_total,
    meatRows,
    revenue_meat_total,
    cost_meat_total,
    result_meat_total,
    revenue_meat_per_kg,
    cost_meat_per_kg,
    subsidies_per_kg,
    other_revenue_total,
    other_revenue_per_kg,
    other_costs_2025_total,
    other_costs_2025_per_kg,
    other_costs_2026,
    oxr_2026,
    oxr_per_kg,
    total_other_costs_money,
    avg_revenue_per_kg,
    avg_cost_per_kg,
    result_milk,
    result_production,
    total_investments,
    invest_1_fixed_assets_calc,
    invest_2_young_cattle_calc,
    result_after_invest,
    factors,
  };
}

// Хук для удобного доступа к расчётам
export function useCalc(): Calculations {
  const state = useModel();
  return calculate(state);
}
