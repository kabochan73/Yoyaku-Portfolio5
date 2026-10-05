import type { ReactNode } from "react";
import { dayOfWeek } from "@/lib/date";
import { formatHour, formatHourRange, formatWeekdayShort } from "@/lib/format";
import type { DayClosedReason } from "../logic/types";

const CLOSED_REASON_LABELS: Record<DayClosedReason, string | null> = {
  past: null,
  out_of_range: "受付外",
  regular_holiday: "定休日",
  holiday: "臨時休業",
};

function dayColor(date: string): string {
  const day = dayOfWeek(date);
  return day === 6
    ? "text-saturday"
    : day === 0
      ? "text-sunday"
      : "text-zinc-700";
}

export function DayHeading({
  date,
  today,
  closedReason,
}: {
  date: string;
  today?: string;
  closedReason?: DayClosedReason | null;
}) {
  const isToday = date === today;
  const note = closedReason ? CLOSED_REASON_LABELS[closedReason] : null;

  return (
    <>
      <span className={`block text-lg font-semibold ${dayColor(date)}`}>
        {formatWeekdayShort(date)}
      </span>
      <span
        className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm ${isToday ? "bg-primary font-bold text-white" : dayColor(date)}`}
      >
        {Number(date.slice(8))}
        {isToday && <span className="sr-only">（今日）</span>}
      </span>
      {note && (
        <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
          {note}
        </span>
      )}
    </>
  );
}

// 管理画面でも使うので、セルの中身は外から受け取る
export function CalendarGrid({
  headings,
  openHour,
  closeHour,
  renderCell,
  dimmed = false,
}: {
  headings: ReactNode[];
  openHour: number;
  closeHour: number;
  renderCell: (column: number, hour: number) => ReactNode;
  dimmed?: boolean;
}) {
  const hours = Array.from(
    { length: closeHour - openHour },
    (_, i) => openHour + i,
  );

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xl transition-opacity ${dimmed ? "opacity-50" : ""}`}
    >
      <table
        className="w-full min-w-[22rem] table-fixed border-collapse text-sm"
        data-dimmed={dimmed}
      >
        <thead>
          <tr className="divide-x divide-zinc-200 border-b border-zinc-200">
            <th
              scope="col"
              className="w-14 py-3 text-center font-medium text-zinc-800 sm:w-28"
            >
              時間
            </th>
            {headings.map((heading, column) => (
              <th key={column} scope="col" className="py-3 text-center">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr
              key={hour}
              className="divide-x divide-zinc-200 border-b border-zinc-200 last:border-0"
            >
              <th
                scope="row"
                className="py-2 text-center text-xs font-normal text-zinc-800"
              >
                <span className="sm:hidden">{formatHour(hour)}</span>
                <span className="hidden sm:inline">
                  {formatHourRange(hour, hour + 1)}
                </span>
              </th>
              {headings.map((_, column) => (
                <td key={column} className="px-1 py-1.5 text-center sm:px-1.5">
                  {renderCell(column, hour)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
