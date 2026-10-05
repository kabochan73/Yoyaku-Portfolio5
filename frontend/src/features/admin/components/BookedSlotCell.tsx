import { formatHourRange, formatMonthDayJa } from "@/lib/format";
import type { AdminReservation } from "../logic/types";

export function BookedSlotCell({
  date,
  hour,
  reservation,
  closedDay,
  disabled = false,
  onOpen,
}: {
  date: string;
  hour: number;
  reservation: AdminReservation;
  closedDay: boolean;
  disabled?: boolean;
  onOpen: () => void;
}) {
  const name = reservation.booker_name ?? "";
  const mark = reservation.is_phone ? "☎ " : "";
  const short = name.length > 2 ? `${name.slice(0, 2)}…` : name;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onOpen}
      aria-label={`${formatMonthDayJa(date)} ${formatHourRange(hour, hour + 1)} ${name} さんの予約${reservation.is_phone ? "（電話）" : ""}`}
      className={`flex h-9 w-full items-center justify-center overflow-hidden rounded px-1 text-xs font-medium text-zinc-800 hover:brightness-95 disabled:cursor-not-allowed sm:text-sm ${closedDay ? "bg-zinc-200" : "bg-amber-100"}`}
    >
      <span className="hidden truncate sm:inline">
        {mark}
        {name}
      </span>
      <span className="truncate sm:hidden">
        {mark}
        {short}
      </span>
    </button>
  );
}
