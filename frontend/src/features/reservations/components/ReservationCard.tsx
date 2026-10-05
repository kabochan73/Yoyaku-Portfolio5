import { Button } from "@/components/ui/Button";
import {
  formatDateJa,
  formatHourRange,
  formatMonthDayJa,
  formatYen,
} from "@/lib/format";
import type { Reservation, ReservationPhase } from "../logic/types";

const PHASE_LABELS: Record<ReservationPhase, string | null> = {
  before_start: null,
  in_use: "ご利用中",
  finished: "ご利用済み",
};

export function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel: () => void;
}) {
  const { date, start_hour, end_hour, hours, price } = reservation;
  const time = formatHourRange(start_hour, end_hour);

  return (
    <article className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="space-y-1">
        <p className="font-bold">{formatDateJa(date)}</p>
        <p className="text-sm">
          {time}（{hours}時間）
        </p>
        <p className="text-sm text-zinc-500">{formatYen(price)}</p>
      </div>
      {reservation.is_cancellable ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          aria-label={`${formatMonthDayJa(date)} ${time} の予約をキャンセル`}
        >
          キャンセル
        </Button>
      ) : (
        <span className="text-sm text-zinc-500">
          {PHASE_LABELS[reservation.phase]}
        </span>
      )}
    </article>
  );
}
