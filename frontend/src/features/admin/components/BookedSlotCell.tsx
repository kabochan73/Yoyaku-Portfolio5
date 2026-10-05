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
      className={`w-full overflow-hidden rounded-md px-1 py-1 text-xs font-semibold transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default sm:px-2 ${closedDay ? "bg-zinc-100 text-zinc-500" : "bg-danger-soft text-danger-muted"}`}
    >
      <span className="hidden truncate sm:block">
        {mark}
        {name}
      </span>
      <span className="block truncate sm:hidden">
        {mark}
        {short}
      </span>
    </button>
  );
}
