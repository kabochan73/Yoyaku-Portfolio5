import { Button } from "@/components/ui/Button";
import { formatWeekRange } from "@/lib/format";

export function WeekNavigator({
  weekStart,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  weekStart: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
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
      <p className="font-medium" aria-live="polite">
        {formatWeekRange(weekStart)}
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
