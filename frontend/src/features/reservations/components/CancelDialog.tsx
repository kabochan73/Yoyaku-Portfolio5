"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { useCancelReservation } from "../logic/hooks";
import type { Reservation } from "../logic/types";
import { ReservationSummary } from "./ReservationSummary";

export function CancelDialog({
  reservation,
  onClose,
  onCancelled,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const cancelReservation = useCancelReservation();
  const [error, setError] = useState<string | null>(null);
  const [shownId, setShownId] = useState(reservation?.id ?? null);

  // 別の予約で開き直したら、前のエラーを消す
  const id = reservation?.id ?? null;
  if (id !== shownId) {
    setShownId(id);
    setError(null);
  }

  const submitting = cancelReservation.isPending;

  const cancel = async () => {
    if (reservation === null) {
      return;
    }
    setError(null);
    try {
      await cancelReservation.mutateAsync(reservation.id);
      onCancelled();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog
      open={reservation !== null}
      onClose={onClose}
      title="予約をキャンセルしますか？"
      closable={!submitting}
    >
      {reservation && (
        <ReservationSummary
          date={reservation.date}
          startHour={reservation.start_hour}
          endHour={reservation.end_hour}
          price={reservation.price}
          priceLabel="料金"
        />
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          戻る
        </Button>
        <Button
          variant="danger"
          disabled={submitting}
          onClick={() => void cancel()}
        >
          {submitting ? "キャンセル中..." : "キャンセルする"}
        </Button>
      </div>
    </Dialog>
  );
}
