import { formatHourRange, formatMonthDayJa } from "@/lib/format";
import type { SlotStatus } from "../logic/types";

const LOOKS: Record<
  SlotStatus,
  { wide: string; narrow: string; spoken: string; className: string }
> = {
  available: {
    wide: "空き",
    narrow: "空",
    spoken: "空き",
    className:
      "border border-primary/30 bg-white text-primary hover:bg-primary-soft",
  },
  booked: {
    wide: "予約済",
    narrow: "✕",
    spoken: "予約済み",
    className: "bg-zinc-100 text-zinc-400",
  },
  past: {
    wide: "－",
    narrow: "－",
    spoken: "受付終了",
    className: "text-zinc-300",
  },
  closed: {
    wide: "－",
    narrow: "－",
    spoken: "受付外",
    className: "text-zinc-300",
  },
};

export function SlotCell({
  date,
  hour,
  status,
  disabled = false,
  onSelect,
}: {
  date: string;
  hour: number;
  status: SlotStatus;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const look = LOOKS[status];

  return (
    <button
      type="button"
      disabled={disabled || status !== "available"}
      onClick={onSelect}
      aria-label={`${formatMonthDayJa(date)} ${formatHourRange(hour, hour + 1)} ${look.spoken}`}
      className={`flex h-9 w-full items-center justify-center rounded text-xs font-medium disabled:cursor-not-allowed sm:text-sm ${look.className}`}
    >
      <span className="hidden sm:inline">{look.wide}</span>
      <span className="sm:hidden">{look.narrow}</span>
    </button>
  );
}
