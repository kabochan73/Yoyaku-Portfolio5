import { Button } from "@/components/ui/Button";
import { formatWeekRange } from "@/lib/format";

export function WeekNavigator({
  weekStart,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  // 読み込み中で週が分からないときは null。範囲を空欄にする
  weekStart: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={!canPrev}
        onClick={onPrev}
      >
        ← 前の週
      </Button>
      <p
        className="text-lg font-medium text-zinc-800 sm:text-xl"
        aria-live="polite"
      >
        {weekStart === null ? "\u00a0" : formatWeekRange(weekStart)}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={!canNext}
        onClick={onNext}
      >
        次の週 →
      </Button>
    </div>
  );
}
