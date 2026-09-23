import { useState } from "react";
import { useCalc } from "@/store/model";
import { KpiCard } from "@/components/KpiCard";
import { Section } from "@/components/Section";
import { fmtMln, fmtPerKg, fmtKg, signClass, fmtRub } from "@/lib/format";
import { TrendingUp, TrendingDown, Coins, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Period = "year" | string; // "year" | месяц (например "Янв")

export function DashboardTab() {
  const c = useCalc();
  const [period, setPeriod] = useState<Period>("year");

  // Выбранный месяц (если выбран)
  const selectedMonth = period === "year" ? null : c.monthly.find((m) => m.month === period) ?? null;

  // Доля месяца в годовом объёме — для масштабирования "годовых" статей (мясо, субсидии, прочие, ОХР)
  const share = selectedMonth && c.total_volume_kg > 0 ? selectedMonth.volume / c.total_volume_kg : 1;

  // Объём и выручка молока за период
  const periodVolume = selectedMonth ? selectedMonth.volume : c.total_volume_kg;
  const periodMilkRevenue = selectedMonth ? selectedMonth.revenue_milk : c.revenue_milk_total;
  const periodMilkPrice = periodVolume > 0 ? periodMilkRevenue / periodVolume : 0;

  // Денежные суммы за период
  const periodMeatRevenue = c.revenue_meat_total * share;
  const periodMeatCost = c.cost_meat_total * share;
  const periodMeatResult = periodMeatRevenue - periodMeatCost;
  const periodSubsidies = c.subsidies_per_kg * periodVolume;
  const periodOtherRevenue = c.other_revenue_per_kg * periodVolume;
  const periodCostMilk = c.cost_milk_2026 * periodVolume;
  const periodOtherCosts = c.other_costs_2026 * periodVolume;
  const periodOxr = c.oxr_2026 * share;

  // Итоги за период (помесячный result уже включает мясо/субсидии/прочее через /кг)
  const periodResultProduction = selectedMonth ? selectedMonth.result : c.result_production;
  const periodAvgRevenuePerKg =
    periodVolume > 0
      ? (periodMilkRevenue + periodMeatRevenue + periodSubsidies + periodOtherRevenue) / periodVolume
      : 0;
  const periodAvgCostPerKg =
    periodVolume > 0
      ? (periodCostMilk + periodMeatCost + periodOtherCosts + periodOxr) / periodVolume
      : 0;

  // Итог после инвестиций — только для года (инвестиции — годовая величина)
  const showInvest = period === "year";
  const periodAfterInvest = c.result_production - c.total_investments;

  const periodLabel = period === "year" ? "2026 (год)" : `${period} 2026`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Переключатель периода */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Выберите период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year" className="font-semibold">Год (2026)</SelectItem>
            {c.monthly.map((m) => (
              <SelectItem key={m.month} value={m.month}>
                {m.month} 2026
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI верхний ряд — 4 карточки */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Результат производства · ${periodLabel}`}
          value={fmtMln(periodResultProduction)}
          subtitle={`Выручка ${fmtPerKg(periodAvgRevenuePerKg)} − СС ${fmtPerKg(periodAvgCostPerKg)} ₽/кг`}
          tone={periodResultProduction >= 0 ? "positive" : "negative"}
          icon={periodResultProduction >= 0 ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
          accent="dashboard"
        />
        {showInvest ? (
          <KpiCard
            title="Итог после инвестиций 2026"
            value={fmtMln(periodAfterInvest)}
            subtitle={`Инвестиции ${fmtMln(c.total_investments)}`}
            tone={periodAfterInvest >= 0 ? "positive" : "negative"}
            icon={<Wallet size={28}/>}
            accent="dashboard"
          />
        ) : (
          <KpiCard
            title={`Выручка молока · ${periodLabel}`}
            value={fmtMln(periodMilkRevenue)}
            subtitle={`Цена ${fmtPerKg(periodMilkPrice)} ₽/кг`}
            icon={<Wallet size={28}/>}
            accent="dashboard"
          />
        )}
        <KpiCard
          title="Выручка на 1 кг молока"
          value={fmtPerKg(periodAvgRevenuePerKg) + " ₽"}
          subtitle={`Объём ${fmtKg(periodVolume)} кг`}
          icon={<Coins size={28}/>}
          accent="milk"
        />
        <KpiCard
          title="Полная СС 1 кг"
          value={fmtPerKg(periodAvgCostPerKg) + " ₽"}
          subtitle={`Маржа ${fmtPerKg(periodAvgRevenuePerKg - periodAvgCostPerKg)} ₽/кг`}
          tone={periodAvgRevenuePerKg - periodAvgCostPerKg >= 0 ? "positive" : "negative"}
          icon={<Coins size={28}/>}
          accent="meat"
        />
      </div>

      {/* Детализация */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title={`Детализация выручки на 1 кг · ${periodLabel}`} accent="milk">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Строка</th>
                <th className="py-2 text-right font-medium">руб/кг</th>
              </tr>
            </thead>
            <tbody className="num">
              <Row label={selectedMonth ? `Цена молока (${period})` : "Цена молока (среднегод.)"} perKg={periodMilkPrice} accent="bg-tab-milk" />
              <Row label="Выручка мяса/плем" perKg={c.revenue_meat_per_kg} accent="bg-tab-meat" />
              <Row label="Субсидии" perKg={c.subsidies_per_kg} accent="bg-tab-other" />
              <Row label="Прочие доходы" perKg={c.other_revenue_per_kg} accent="bg-tab-other" />
              <tr className="border-t-2 border-foreground/30 font-bold">
                <td className="py-3">ИТОГО выручка/кг</td>
                <td className="py-3 text-right">{fmtPerKg(periodAvgRevenuePerKg)}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title={`Детализация себестоимости на 1 кг · ${periodLabel}`} accent="meat">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Строка</th>
                <th className="py-2 text-right font-medium">руб/кг</th>
              </tr>
            </thead>
            <tbody className="num">
              <Row label="СС молока 2026" perKg={c.cost_milk_2026} accent="bg-tab-milk" />
              <Row label="СС мяса/кг молока" perKg={c.cost_meat_per_kg} accent="bg-tab-meat" />
              <Row label="Прочие расходы 2026" perKg={c.other_costs_2026} accent="bg-tab-other" />
              <Row label="Общехозяйственные расходы 2026" perKg={c.oxr_per_kg} accent="bg-tab-other" />
              <tr className="border-t-2 border-foreground/30 font-bold">
                <td className="py-3">ИТОГО СС/кг</td>
                <td className="py-3 text-right">{fmtPerKg(periodAvgCostPerKg)}</td>
              </tr>
            </tbody>
          </table>
        </Section>
      </div>

      {/* Помесячный результат */}
      <Section title="Финансовый результат по месяцам, млн ₽" accent="monthly">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Месяц</th>
                <th className="py-2 text-right font-medium">Объём, кг</th>
                <th className="py-2 text-right font-medium">Цена</th>
                <th className="py-2 text-right font-medium">Маржа/кг</th>
                <th className="py-2 text-right font-medium">Результат</th>
              </tr>
            </thead>
            <tbody className="num">
              {c.monthly.map((m) => {
                const isActive = period === m.month;
                return (
                  <tr
                    key={m.month}
                    onClick={() => setPeriod(m.month)}
                    className={
                      "border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors " +
                      (isActive ? "bg-muted font-semibold" : "")
                    }
                  >
                    <td className="py-2 font-medium">{m.month}</td>
                    <td className="py-2 text-right">{fmtKg(m.volume)}</td>
                    <td className="py-2 text-right">{fmtPerKg(m.effective_price)}</td>
                    <td className={"py-2 text-right " + signClass(m.margin_per_kg)}>{fmtPerKg(m.margin_per_kg)}</td>
                    <td className={"py-2 text-right font-semibold " + signClass(m.result)}>{fmtMln(m.result)}</td>
                  </tr>
                );
              })}
              {(() => {
                const totalVol = c.monthly.reduce((s, m) => s + m.volume, 0);
                const totalRev = c.monthly.reduce((s, m) => s + m.revenue_milk, 0);
                const totalMargin = c.monthly.reduce((s, m) => s + m.margin_per_kg * m.volume, 0);
                const avgPrice = totalVol > 0 ? totalRev / totalVol : 0;
                const avgMargin = totalVol > 0 ? totalMargin / totalVol : 0;
                return (
                  <tr
                    onClick={() => setPeriod("year")}
                    className={
                      "border-t-2 border-foreground/30 font-bold cursor-pointer hover:bg-muted/50 transition-colors " +
                      (period === "year" ? "bg-muted" : "")
                    }
                  >
                    <td className="py-3">Год</td>
                    <td className="py-3 text-right">{fmtKg(c.total_volume_kg)}</td>
                    <td className="py-3 text-right">{fmtPerKg(avgPrice)}</td>
                    <td className={"py-3 text-right " + signClass(avgMargin)}>{fmtPerKg(avgMargin)}</td>
                    <td className={"py-3 text-right " + signClass(c.result_milk)}>{fmtMln(c.result_milk)}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Row({ label, perKg, accent }: { label: string; perKg: number; accent: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          <span className={"h-2 w-2 rounded-full " + accent} />
          <span>{label}</span>
        </div>
      </td>
      <td className="py-2.5 text-right">{fmtPerKg(perKg)}</td>
    </tr>
  );
}

// fmtRub импорт оставлен для совместимости, но больше не используется
void fmtRub;
