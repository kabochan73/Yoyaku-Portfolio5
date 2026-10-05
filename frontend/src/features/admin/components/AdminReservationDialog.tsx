"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ReservationSummary } from "@/features/reservations/components/ReservationSummary";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { useCancelReservationAsAdmin } from "../logic/hooks";
import type { AdminReservation } from "../logic/types";

export function AdminReservationDialog({
  reservation,
  onClose,
}: {
  reservation: AdminReservation | null;
  onClose: () => void;
}) {
  const cancelReservation = useCancelReservationAsAdmin();
  const [error, setError] = useState<string | null>(null);
  const id = reservation?.id ?? null;
  const [shownId, setShownId] = useState(id);

  // 別の予約で開き直したら、前のエラーを消す
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
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog
      open={reservation !== null}
      onClose={onClose}
      title="予約の詳細"
      closable={!submitting}
    >
      {reservation && (
        <>
          <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
            <dt className="text-zinc-500">予約者</dt>
            <dd>{reservation.booker_name}</dd>
            <dt className="text-zinc-500">種別</dt>
            <dd>{reservation.is_phone ? "電話" : "会員"}</dd>
          </dl>
          <ReservationSummary
            date={reservation.date}
            startHour={reservation.start_hour}
            endHour={reservation.end_hour}
            price={reservation.price}
            priceLabel="料金"
          />
          {reservation.is_cancellable && !reservation.is_phone && (
            <p className="text-xs text-zinc-500">
              会員にキャンセルのメールが送られます
            </p>
          )}
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          戻る
        </Button>
        {reservation?.is_cancellable && (
          <Button
            variant="danger"
            disabled={submitting}
            onClick={() => void cancel()}
          >
            {submitting ? "キャンセル中..." : "この予約をキャンセル"}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
