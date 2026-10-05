"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useCurrentUser } from "@/features/auth/logic/hooks";
import { useFacility } from "@/features/facility/logic/hooks";
import { estimatePrice } from "@/features/facility/logic/price";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { useCreateReservation } from "../logic/hooks";
import type { NewReservation } from "../logic/types";
import { ReservationSummary } from "./ReservationSummary";

type Failure = { message: string; code: string | null };

function failureOf(error: unknown): Failure {
  return error instanceof ApiError
    ? { message: error.message, code: error.code }
    : { message: NETWORK_ERROR_MESSAGE, code: null };
}

export function ReservationConfirmDialog({
  slot,
  onClose,
  onReserved,
}: {
  slot: NewReservation | null;
  onClose: () => void;
  onReserved: () => void;
}) {
  const router = useRouter();
  const { data: facility } = useFacility();
  const { data: user, isPending: userPending } = useCurrentUser();
  const createReservation = useCreateReservation();
  const [failure, setFailure] = useState<Failure | null>(null);
  const slotKey = slot
    ? `${slot.date}:${slot.start_hour}-${slot.end_hour}`
    : null;
  const [shownSlotKey, setShownSlotKey] = useState(slotKey);

  // 別の枠で開き直したら、前のエラーを消す
  if (slotKey !== shownSlotKey) {
    setShownSlotKey(slotKey);
    setFailure(null);
  }

  const submitting = createReservation.isPending;
  const slotTaken = failure?.code === "slot_taken";

  const reserve = async () => {
    if (slot === null) {
      return;
    }
    setFailure(null);
    try {
      await createReservation.mutateAsync(slot);
      onReserved();
    } catch (error) {
      setFailure(failureOf(error));
    }
  };

  return (
    <Dialog
      open={slot !== null}
      onClose={onClose}
      title="予約内容の確認"
      closable={!submitting}
    >
      {slot && facility && (
        <ReservationSummary
          date={slot.date}
          startHour={slot.start_hour}
          endHour={slot.end_hour}
          price={estimatePrice(
            facility,
            slot.date,
            slot.start_hour,
            slot.end_hour,
          )}
        />
      )}
      {failure && (
        <Alert tone="error">
          {failure.message}
          {failure.code === "already_booked_that_day" && (
            <>
              {" "}
              <Link href="/mypage" className="underline">
                マイページで確認
              </Link>
            </>
          )}
        </Alert>
      )}
      {user === null && (
        <p className="text-sm text-zinc-700">予約にはログインが必要です。</p>
      )}
      {user?.role === "admin" && (
        <p className="text-sm text-zinc-700">
          管理者は、管理画面の電話予約から登録してください。
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          戻る
        </Button>
        {user === null ? (
          <Button onClick={() => router.push("/login")}>
            ログインして予約
          </Button>
        ) : user?.role === "admin" ? (
          <Link href="/admin" className={buttonClassName()}>
            管理画面へ
          </Link>
        ) : (
          <Button
            disabled={userPending || submitting || slotTaken}
            onClick={() => void reserve()}
          >
            {submitting ? "予約中..." : "予約する"}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
