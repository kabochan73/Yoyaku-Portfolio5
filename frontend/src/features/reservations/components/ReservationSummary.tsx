import { formatDateJa, formatHourRange, formatYen } from "@/lib/format";

export function ReservationSummary({
  date,
  startHour,
  endHour,
  price,
  priceLabel = "合計料金",
}: {
  date: string;
  startHour: number;
  endHour: number;
  price: number;
  priceLabel?: string;
}) {
  const rows = [
    ["日付", formatDateJa(date)],
    ["時間", formatHourRange(startHour, endHour)],
    ["利用時間", `${endHour - startHour}時間`],
    [priceLabel, formatYen(price)],
  ] as const;

  return (
    <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-500">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
