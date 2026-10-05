"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { ErrorState } from "@/components/ui/ErrorState";
import { useFacility } from "@/features/facility/logic/hooks";
import { ReservationConfirmDialog } from "@/features/reservations/components/ReservationConfirmDialog";
import { addDays, mondayOf, todayInTokyo } from "@/lib/date";
import { useCalendar } from "../logic/hooks";
import {
  endCandidates,
  IDLE,
  selectSlot,
  type GetStatus,
  type Selection,
} from "../logic/selection";
import type { InitialCalendar } from "../logic/server";
import { CalendarGrid, DayHeading } from "./CalendarGrid";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { SelectionHint } from "./SelectionHint";
import { SlotCell, type SlotMark } from "./SlotCell";
import { WeekNavigator } from "./WeekNavigator";

function markOf(
  selection: Selection,
  candidates: number[],
  date: string,
  hour: number,
): SlotMark | undefined {
  if (selection.kind === "idle" || selection.date !== date) {
    return undefined;
  }
  if (selection.kind === "start") {
    if (hour === selection.hour) {
      return "start";
    }
    return candidates.includes(hour) ? "candidate" : undefined;
  }
  return hour >= selection.startHour && hour < selection.endHour
    ? "selected"
    : undefined;
}

export function BookingCalendar({
  initialCalendar,
}: {
  initialCalendar: InitialCalendar | null;
}) {
  const { data: facility } = useFacility();
  const [thisWeek] = useState(
    () => initialCalendar?.weekStart ?? mondayOf(todayInTokyo()),
  );
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [selection, setSelection] = useState<Selection>(IDLE);
  const [reserved, setReserved] = useState(false);
  const reservedRef = useRef<HTMLDivElement>(null);
  const calendar = useCalendar(weekStart, initialCalendar);

  // 予約した枠は押せなくなり、ダイアログを開いたボタンへフォーカスを戻せないので、成功のメッセージへ移す
  useEffect(() => {
    if (reserved) {
      reservedRef.current?.focus();
    }
  }, [reserved]);

  if (!facility) {
    return null;
  }

  const { open_hour: openHour, close_hour: closeHour } = facility.rules;
  const data = calendar.data;
  const nextWeek = addDays(weekStart, 7);
  const bookableUntil = data?.meta.bookable_until;
  // 週の切り替え中は前の週の枠を出したままにするので、押させない
  const switching = calendar.isPlaceholderData;
  const rules = {
    minHours: facility.rules.min_hours,
    maxHours: facility.rules.max_hours,
  };
  // 取り直しで枠の状態が変わっても、選択は毎回最新のデータで判定し直す
  const getStatus: GetStatus = (date, hour) =>
    switching
      ? undefined
      : data?.data
          .find((day) => day.date === date)
          ?.slots.find((slot) => slot.hour === hour)?.status;
  const candidates = endCandidates(selection, getStatus, rules);

  const changeSelection = (next: Selection) => {
    setSelection(next);
    setReserved(false);
  };

  const changeWeek = (week: string) => {
    setWeekStart(week);
    changeSelection(IDLE);
  };

  return (
    <div className="space-y-4">
      <WeekNavigator
        weekStart={weekStart}
        canPrev={weekStart > thisWeek}
        canNext={bookableUntil !== undefined && nextWeek <= bookableUntil}
        onPrev={() => changeWeek(addDays(weekStart, -7))}
        onNext={() => changeWeek(nextWeek)}
      />
      {reserved && (
        <div ref={reservedRef} tabIndex={-1} className="outline-none">
          <Alert tone="success">
            予約しました。確認メールをお送りしました。{" "}
            <Link href="/mypage" className="underline">
              マイページで確認
            </Link>
          </Alert>
        </div>
      )}
      <SelectionHint
        selection={selection}
        candidateCount={candidates.length}
        rules={rules}
      />
      {data ? (
        <CalendarGrid
          headings={Array.from({ length: 7 }, (_, column) => {
            const date = addDays(weekStart, column);
            return (
              <DayHeading
                key={date}
                date={date}
                closedReason={
                  switching ? null : data.data[column]?.closed_reason
                }
              />
            );
          })}
          openHour={openHour}
          closeHour={closeHour}
          dimmed={switching}
          renderCell={(column, hour) => {
            const date = addDays(weekStart, column);
            const slot = data.data[column]?.slots.find((s) => s.hour === hour);
            return (
              <SlotCell
                date={date}
                hour={hour}
                status={slot?.status ?? "closed"}
                mark={markOf(selection, candidates, date, hour)}
                disabled={switching}
                onSelect={() =>
                  changeSelection(
                    selectSlot(selection, { date, hour }, getStatus, rules),
                  )
                }
              />
            );
          }}
        />
      ) : calendar.isError ? (
        <ErrorState
          message="空き状況を取得できませんでした。"
          onRetry={() => void calendar.refetch()}
        />
      ) : (
        <CalendarSkeleton openHour={openHour} closeHour={closeHour} />
      )}
      <ReservationConfirmDialog
        slot={
          selection.kind === "complete"
            ? {
                date: selection.date,
                start_hour: selection.startHour,
                end_hour: selection.endHour,
              }
            : null
        }
        onClose={() => setSelection(IDLE)}
        onReserved={() => {
          setSelection(IDLE);
          setReserved(true);
        }}
      />
    </div>
  );
}
