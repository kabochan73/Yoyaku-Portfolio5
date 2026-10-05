"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useFacility } from "@/features/facility/logic/hooks";
import { addDays, mondayOf, todayInTokyo } from "@/lib/date";
import { useCalendar } from "../logic/hooks";
import type { InitialCalendar } from "../logic/server";
import { CalendarGrid, DayHeading } from "./CalendarGrid";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { SlotCell } from "./SlotCell";
import { WeekNavigator } from "./WeekNavigator";

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
  const calendar = useCalendar(weekStart, initialCalendar);

  if (!facility) {
    return null;
  }

  const { open_hour: openHour, close_hour: closeHour } = facility.rules;
  const data = calendar.data;
  const nextWeek = addDays(weekStart, 7);
  const bookableUntil = data?.meta.bookable_until;
  // 週の切り替え中は前の週の枠を出したままにするので、押させない
  const switching = calendar.isPlaceholderData;

  return (
    <div className="space-y-4">
      <WeekNavigator
        weekStart={weekStart}
        canPrev={weekStart > thisWeek}
        canNext={bookableUntil !== undefined && nextWeek <= bookableUntil}
        onPrev={() => setWeekStart(addDays(weekStart, -7))}
        onNext={() => setWeekStart(nextWeek)}
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
            const day = data.data[column];
            const slot = day?.slots.find((s) => s.hour === hour);
            return (
              <SlotCell
                date={addDays(weekStart, column)}
                hour={hour}
                status={slot?.status ?? "closed"}
                disabled={switching}
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
    </div>
  );
}
