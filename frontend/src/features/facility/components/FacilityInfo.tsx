import { formatHourRange, formatWeekdays, formatYen } from "@/lib/format";
import type { Facility } from "../logic/types";

export function FacilityInfo({ facility }: { facility: Facility }) {
  const { rules, prices } = facility;

  const items = [
    ["営業時間", formatHourRange(rules.open_hour, rules.close_hour)],
    [
      "料金（1時間）",
      `平日 ${formatYen(prices.weekday)}・土日 ${formatYen(prices.weekend)}`,
    ],
    ["定休日", formatWeekdays(facility.regular_holidays)],
    ["利用時間(相談可)", `${rules.min_hours}〜${rules.max_hours}時間`],
    ["レンタル", "ボール・ビブス無料"],
    ["支払い方法", "現地払いのみ"],
  ] as const;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <dl className="mx-auto grid w-fit grid-cols-1 gap-x-8 gap-y-6 sm:mx-0 sm:w-auto sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-1 text-primary">
              ●
            </span>
            <div>
              <dt className="text-sm text-zinc-500">{label}</dt>
              <dd className="font-semibold text-zinc-900">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
