import { formatHour, formatHourRange, formatMonthDayJa } from "@/lib/format";
import type { Selection, SelectionRules } from "../logic/selection";

function hintOf(
  selection: Selection,
  candidateCount: number,
  { minHours, maxHours }: SelectionRules,
): string {
  switch (selection.kind) {
    case "idle":
      return `開始時刻の枠を選んでください（${minHours}〜${maxHours}時間）`;
    case "start":
      return candidateCount === 0
        ? `この時間からは${minHours}時間以上続けて空いていません。別の枠を選んでください`
        : `終了時刻の枠を選んでください。${formatHour(selection.hour)}から${minHours}〜${maxHours}時間まで選べます`;
    case "complete":
      return `${formatMonthDayJa(selection.date)} ${formatHourRange(selection.startHour, selection.endHour)}（${selection.endHour - selection.startHour}時間）を選びました`;
  }
}

export function SelectionHint({
  selection,
  candidateCount,
  rules,
}: {
  selection: Selection;
  candidateCount: number;
  rules: SelectionRules;
}) {
  return (
    <p
      aria-live="polite"
      data-testid="selection-hint"
      className="text-sm text-zinc-700"
    >
      {hintOf(selection, candidateCount, rules)}
    </p>
  );
}
