"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  CalendarGrid,
  DayHeading,
} from "@/features/calendar/components/CalendarGrid";
import { CalendarSkeleton } from "@/features/calendar/components/CalendarSkeleton";
import { SlotCell } from "@/features/calendar/components/SlotCell";
import { WeekNavigator } from "@/features/calendar/components/WeekNavigator";
import { useFacility } from "@/features/facility/logic/hooks";
import { addDays, mondayOf, todayInTokyo } from "@/lib/date";
import { useAdminCalendar } from "../logic/hooks";
import type { AdminReservation } from "../logic/types";
import { AdminReservationDialog } from "./AdminReservationDialog";
import { BookedSlotCell } from "./BookedSlotCell";

export function AdminCalendar() {
  const { data: facility } = useFacility();
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInTokyo()));
  const [opened, setOpened] = useState<AdminReservation | null>(null);
  const calendar = useAdminCalendar(weekStart);

  if (!facility) {
    return null;
  }

  const { open_hour: openHour, close_hour: closeHour } = facility.rules;
  const data = calendar.data;
  const oldestDate = data?.meta.oldest_date;
  // 週の切り替え中は前の週の枠を出したままにするので、押させない
  const switching = calendar.isPlaceholderData;

  return (
    <div className="space-y-4">
      <WeekNavigator
        weekStart={weekStart}
        canPrev={oldestDate !== undefined && weekStart > mondayOf(oldestDate)}
        canNext
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(addDays(weekStart, 7))}
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
                disabled={switching}
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
    </div>
  );
}
