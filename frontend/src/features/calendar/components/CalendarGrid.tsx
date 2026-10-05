import type { ReactNode } from "react";
import { formatHour, formatShortDate } from "@/lib/format";
import type { DayClosedReason } from "../logic/types";

const CLOSED_REASON_LABELS: Record<DayClosedReason, string | null> = {
  past: null,
  out_of_range: "受付外",
  regular_holiday: "定休日",
  holiday: "臨時休業",
};

export function DayHeading({
  date,
  closedReason,
}: {
  date: string;
  closedReason?: DayClosedReason | null;
}) {
  const note = closedReason ? CLOSED_REASON_LABELS[closedReason] : null;

  return (
    <>
      <span className="block">{formatShortDate(date)}</span>
      {note && (
        <span className="block text-xs font-normal text-zinc-500">{note}</span>
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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table
        className={`w-full min-w-[36rem] table-fixed border-collapse text-sm transition-opacity ${dimmed ? "opacity-50" : ""}`}
        data-dimmed={dimmed}
      >
        <thead>
          <tr>
            <th scope="col" className="w-16 sm:w-28">
              <span className="sr-only">時間</span>
            </th>
            {headings.map((heading, column) => (
              <th
                key={column}
                scope="col"
                className="border-l border-zinc-100 px-1 py-2 text-center font-medium"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th
                scope="row"
                className="border-t border-zinc-100 px-2 text-left font-normal whitespace-nowrap text-zinc-500"
              >
                {formatHour(hour)}
                <span className="hidden sm:inline">
                  〜{formatHour(hour + 1)}
                </span>
              </th>
              {headings.map((_, column) => (
                <td
                  key={column}
                  className="border-t border-l border-zinc-100 p-1"
                >
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
