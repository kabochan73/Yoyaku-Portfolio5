"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { useCreateHoliday } from "../logic/hooks";
import type { NewHoliday } from "../logic/types";

export type HolidayConflict = {
  holiday: NewHoliday;
  reservationCount: number;
};

export function HolidayConflictDialog({
  conflict,
  onClose,
  onClosed,
}: {
  conflict: HolidayConflict | null;
  onClose: () => void;
  onClosed: () => void;
}) {
  const createHoliday = useCreateHoliday();
  const [error, setError] = useState<string | null>(null);
  const submitting = createHoliday.isPending;
  const count = conflict?.reservationCount ?? 0;

  const confirm = async () => {
    if (conflict === null) {
      return;
    }
    setError(null);
    try {
      await createHoliday.mutateAsync({
        ...conflict.holiday,
        cancel_reservations: true,
      });
      onClosed();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <Dialog
      open={conflict !== null}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={`この日には予約が${count}件あります`}
      closable={!submitting}
    >
      <p className="text-sm text-zinc-700">
        休業日にすると、{count}
        件の予約をすべてキャンセルし、会員の方には施設都合のキャンセルメールを送ります。
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={submitting}
          onClick={() => {
            setError(null);
            onClose();
          }}
        >
          戻る
        </Button>
        <Button
          variant="danger"
          disabled={submitting}
          onClick={() => void confirm()}
        >
          {submitting ? "登録中..." : "予約をキャンセルして休業日にする"}
        </Button>
      </div>
    </Dialog>
  );
}
