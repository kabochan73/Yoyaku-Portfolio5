"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFacility } from "@/features/facility/logic/hooks";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { formatWeekdays } from "@/lib/format";
import { useUpdateRegularHolidays } from "../logic/hooks";

// 0（日）〜 6（土）を月曜始まりに並べる
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function RegularHolidayForm() {
  const facility = useFacility();

  if (facility.isPending) {
    // 読み込む前に保存させると、定休日が「なし」として保存されてしまう
    return (
      <div data-testid="regular-holiday-form-loading">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (facility.isError) {
    return (
      <ErrorState
        message="定休日を取得できませんでした。"
        onRetry={() => void facility.refetch()}
      />
    );
  }

  return <RegularHolidayFields initialDays={facility.data.regular_holidays} />;
}

function RegularHolidayFields({ initialDays }: { initialDays: number[] }) {
  const updateRegularHolidays = useUpdateRegularHolidays();
  const [days, setDays] = useState(initialDays);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = updateRegularHolidays.isPending;

  const toggle = (day: number) => {
    setSaved(false);
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    );
  };

  const save = async () => {
    setSaved(false);
    setError(null);
    try {
      await updateRegularHolidays.mutateAsync(
        WEEKDAYS.filter((day) => days.includes(day)),
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <div className="space-y-4">
      {saved && (
        <Alert tone="success">
          保存しました。トップページにも反映されました。
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div role="group" aria-label="定休日" className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const pressed = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={pressed}
              aria-label={formatWeekdays([day])}
              onClick={() => toggle(day)}
              className={`h-10 w-12 rounded-md border text-sm font-medium transition-colors ${pressed ? "border-primary bg-primary text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"}`}
            >
              {formatWeekdays([day]).slice(0, 1)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">
        すでに入っている予約はキャンセルされません。
      </p>
      <Button disabled={submitting} onClick={() => void save()}>
        {submitting ? "保存中..." : "保存する"}
      </Button>
    </div>
  );
}
