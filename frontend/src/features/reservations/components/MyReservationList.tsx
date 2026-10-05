"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { buttonClassName } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyReservations } from "../logic/hooks";
import type { Reservation } from "../logic/types";
import { CancelDialog } from "./CancelDialog";
import { ReservationCard } from "./ReservationCard";

export function MyReservationList() {
  const reservations = useMyReservations();
  const [cancelling, setCancelling] = useState<Reservation | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const cancelledRef = useRef<HTMLDivElement>(null);

  // キャンセルした予約は一覧から消え、ダイアログを開いたボタンへフォーカスを戻せないので、メッセージへ移す
  useEffect(() => {
    if (cancelled) {
      cancelledRef.current?.focus();
    }
  }, [cancelled]);

  return (
    <div className="space-y-4">
      {cancelled && (
        <div ref={cancelledRef} tabIndex={-1} className="outline-none">
          <Alert tone="success">予約をキャンセルしました。</Alert>
        </div>
      )}
      {reservations.isPending ? (
        <div className="space-y-4" data-testid="reservations-loading">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : reservations.isError ? (
        <ErrorState
          message="予約を取得できませんでした。"
          onRetry={() => void reservations.refetch()}
        />
      ) : reservations.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-zinc-700">今後の予約はありません。</p>
          <Link href="/#calendar" className={buttonClassName({ size: "sm" })}>
            空き状況を見る
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {reservations.data.map((reservation) => (
            <li key={reservation.id}>
              <ReservationCard
                reservation={reservation}
                onCancel={() => {
                  setCancelled(false);
                  setCancelling(reservation);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <CancelDialog
        reservation={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={() => {
          setCancelling(null);
          setCancelled(true);
        }}
      />
    </div>
  );
}
