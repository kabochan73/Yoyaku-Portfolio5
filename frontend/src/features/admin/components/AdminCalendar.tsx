"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CalendarGrid,
  DayHeading,
} from "@/features/calendar/components/CalendarGrid";
import { CalendarSkeleton } from "@/features/calendar/components/CalendarSkeleton";
import { SlotCell } from "@/features/calendar/components/SlotCell";
import { SelectionHint } from "@/features/calendar/components/SelectionHint";
import { WeekNavigator } from "@/features/calendar/components/WeekNavigator";
import {
  endCandidates,
  IDLE,
  selectSlot,
  slotMarkOf,
  type GetStatus,
  type Selection,
} from "@/features/calendar/logic/selection";
import { useFacility } from "@/features/facility/logic/hooks";
import { addDays, mondayOf, todayInTokyo } from "@/lib/date";
import { useAdminCalendar } from "../logic/hooks";
import type { AdminReservation } from "../logic/types";
import { AdminReservationDialog } from "./AdminReservationDialog";
import { BookedSlotCell } from "./BookedSlotCell";
import { PhoneReservationDialog } from "./PhoneReservationDialog";

export function AdminCalendar() {
  const facilityQuery = useFacility();
  const facility = facilityQuery.data;
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInTokyo()));
  const [opened, setOpened] = useState<AdminReservation | null>(null);
  const [selection, setSelection] = useState<Selection>(IDLE);
  const [reserved, setReserved] = useState(false);
  const reservedRef = useRef<HTMLDivElement>(null);
  const calendar = useAdminCalendar(weekStart);

  // 登録した枠は予約者名のボタンに置き換わり、ダイアログを開いたボタンへフォーカスを戻せないので、メッセージへ移す
  useEffect(() => {
    if (reserved) {
      reservedRef.current?.focus();
    }
  }, [reserved]);

  if (facilityQuery.isError) {
    return (
      <ErrorState
        message="施設情報を取得できませんでした。"
        onRetry={() => void facilityQuery.refetch()}
      />
    );
  }

  // 営業時間が分かるまでは表の行数が決まらないので、だいたい同じ高さの枠を出して、下の設定がずれないようにする
  if (!facility) {
    return (
      <div className="space-y-4" data-testid="admin-calendar-loading">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[37rem] w-full" />
      </div>
    );
  }

  const { open_hour: openHour, close_hour: closeHour } = facility.rules;
  const data = calendar.data;
  const oldestDate = data?.meta.oldest_date;
  // 週の切り替え中は前の週の枠を出したままにするので、押させない
  const switching = calendar.isPlaceholderData;
  const rules = {
    minHours: facility.rules.min_hours,
    maxHours: facility.rules.max_hours,
  };
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
        canPrev={oldestDate !== undefined && weekStart > mondayOf(oldestDate)}
        canNext
        onPrev={() => changeWeek(addDays(weekStart, -7))}
        onNext={() => changeWeek(addDays(weekStart, 7))}
      />
      {reserved && (
        <div ref={reservedRef} tabIndex={-1} className="outline-none">
          <Alert tone="success">電話予約を登録しました。</Alert>
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
            const day = data.data[column];
            const slot = day?.slots.find((s) => s.hour === hour);
            const reservation = day?.reservations.find(
              (r) => r.id === slot?.reservation_id,
            );

            if (reservation) {
              return (
                <BookedSlotCell
                  date={date}
                  hour={hour}
                  reservation={reservation}
                  closedDay={day?.closed_reason != null}
                  disabled={switching}
                  onOpen={() => setOpened(reservation)}
                />
              );
            }
            return (
              <SlotCell
                date={date}
                hour={hour}
                status={slot?.status ?? "closed"}
                mark={slotMarkOf(selection, candidates, date, hour)}
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
          message="予約状況を取得できませんでした。"
          onRetry={() => void calendar.refetch()}
        />
      ) : (
        <CalendarSkeleton openHour={openHour} closeHour={closeHour} />
      )}
      <AdminReservationDialog
        reservation={opened}
        onClose={() => setOpened(null)}
      />
      <PhoneReservationDialog
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
