"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { formatDateJa, formatMonthDayJa } from "@/lib/format";
import { useDeleteHoliday, useHolidays } from "../logic/hooks";
import type { Holiday } from "../logic/types";

export function HolidayList() {
  const holidays = useHolidays();
  const deleteHoliday = useDeleteHoliday();
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submitting = deleteHoliday.isPending;

  // 削除した行は消えて、ダイアログを開いたボタンへフォーカスを戻せないので、一覧の見出しへ移す
  useEffect(() => {
    if (deletedCount > 0) {
      headingRef.current?.focus();
    }
  }, [deletedCount]);

  const close = () => {
    setDeleting(null);
    setError(null);
  };

  const remove = async () => {
    if (deleting === null) {
      return;
    }
    setError(null);
    try {
      await deleteHoliday.mutateAsync(deleting.id);
      close();
      setDeletedCount((count) => count + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <div className="space-y-3">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-medium text-zinc-700 outline-none"
      >
        登録済みの休業日
      </h3>
      {holidays.isPending ? (
        <div className="space-y-2" data-testid="holidays-loading">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : holidays.isError ? (
        <ErrorState
          message="休業日を取得できませんでした。"
          onRetry={() => void holidays.refetch()}
        />
      ) : holidays.data.length === 0 ? (
        <p className="text-sm text-zinc-500">登録された休業日はありません。</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {holidays.data.map((holiday) => (
            <li
              key={holiday.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>
                {formatDateJa(holiday.date)}
                {holiday.reason && ` — ${holiday.reason}`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                aria-label={`${formatMonthDayJa(holiday.date)}の休業日を削除`}
                onClick={() => setDeleting(holiday)}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={deleting !== null}
        onClose={close}
        title="休業日を解除しますか？"
        closable={!submitting}
      >
        {deleting && (
          <p className="text-sm text-zinc-700">
            {formatDateJa(deleting.date)}
            を営業日に戻します。キャンセルした予約は元に戻りません。
          </p>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={submitting} onClick={close}>
            戻る
          </Button>
          <Button
            variant="danger"
            disabled={submitting}
            onClick={() => void remove()}
          >
            {submitting ? "解除中..." : "解除する"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
