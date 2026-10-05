import { formatHourRange, formatWeekdays, formatYen } from "@/lib/format";
import type { Facility } from "../logic/types";

export function FacilityInfo({ facility }: { facility: Facility }) {
  const { rules, prices } = facility;

  const items = [
    ["営業時間", formatHourRange(rules.open_hour, rules.close_hour)],
    [
      "料金",
      `平日 ${formatYen(prices.weekday)} / 土日 ${formatYen(prices.weekend)}（1時間あたり、祝日は平日料金）`,
    ],
    [
      "定休日",
      facility.regular_holidays.length === 0
        ? "なし"
        : `毎週 ${formatWeekdays(facility.regular_holidays)}`,
    ],
    ["利用時間", `${rules.min_hours}〜${rules.max_hours}時間（1時間単位）`],
    ["予約受付", `${rules.booking_window_months}か月先まで`],
    ["貸し出し", "ボール・ビブス無料"],
    ["支払い", "現地払いのみ"],
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="mb-4 text-xl font-bold">施設案内</h2>
      <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr]"
          >
            <dt className="text-sm font-medium text-zinc-500">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
