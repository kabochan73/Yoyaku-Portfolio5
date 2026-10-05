import type { FacilityRules } from "@/features/facility/logic/types";
import { IDLE } from "../logic/selection";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { SelectionHint } from "./SelectionHint";
import { WeekNavigator } from "./WeekNavigator";

// サーバーで今週を取っている間に出す。週送りと案内は本物と同じ形にし、表だけスケルトンにする
export function BookingCalendarPlaceholder({
  rules,
}: {
  rules: FacilityRules;
}) {
  return (
    <div className="space-y-4">
      <WeekNavigator weekStart={null} canPrev={false} canNext={false} />
      <SelectionHint
        selection={IDLE}
        candidateCount={0}
        rules={{ minHours: rules.min_hours, maxHours: rules.max_hours }}
      />
      <CalendarSkeleton
        openHour={rules.open_hour}
        closeHour={rules.close_hour}
      />
    </div>
  );
}
