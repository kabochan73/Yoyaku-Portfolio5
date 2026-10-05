import { formatHourRange, formatMonthDayJa } from "@/lib/format";
import type { SlotMark } from "../logic/selection";
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

const CHOSEN_CLASS_NAME = "bg-primary text-white hover:bg-primary-hover";

const MARKS: Record<
  SlotMark,
  { wide: string; spoken: string; chosen: boolean; className: string }
> = {
  start: {
    wide: "開始",
    spoken: "開始",
    chosen: true,
    className: CHOSEN_CLASS_NAME,
  },
  candidate: {
    wide: "空き",
    spoken: "終了候補",
    chosen: false,
    className:
      "border-2 border-primary bg-primary-soft text-primary hover:bg-green-100",
  },
  selected: {
    wide: "選択中",
    spoken: "選択中",
    chosen: true,
    className: CHOSEN_CLASS_NAME,
  },
};

export function SlotCell({
  date,
  hour,
  status,
  mark,
  disabled = false,
  onSelect,
}: {
  date: string;
  hour: number;
  status: SlotStatus;
  mark?: SlotMark;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const look = LOOKS[status];
  // 取り直しで予約済みに変わった枠には、選択の印を付けない
  const marked =
    mark !== undefined && status === "available" ? MARKS[mark] : null;
  const spoken = marked ? `${look.spoken}（${marked.spoken}）` : look.spoken;

  return (
    <button
      type="button"
      disabled={disabled || status !== "available"}
      onClick={onSelect}
      aria-label={`${formatMonthDayJa(date)} ${formatHourRange(hour, hour + 1)} ${spoken}`}
      aria-pressed={marked?.chosen || undefined}
      className={`flex h-9 w-full items-center justify-center rounded text-xs font-medium disabled:cursor-not-allowed sm:text-sm ${marked?.className ?? look.className}`}
    >
      <span className="hidden sm:inline">{marked?.wide ?? look.wide}</span>
      <span className="sm:hidden">{look.narrow}</span>
    </button>
  );
}
