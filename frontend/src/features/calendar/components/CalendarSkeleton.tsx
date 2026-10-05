import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarGrid } from "./CalendarGrid";

// 静的シェルでは今日が分からないので、日付の代わりに曜日だけを出す
const WEEKDAY_HEADINGS = ["月", "火", "水", "木", "金", "土", "日"];

export function CalendarSkeleton({
  openHour,
  closeHour,
}: {
  openHour: number;
  closeHour: number;
}) {
  return (
    <div className="space-y-4" data-testid="calendar-skeleton">
      <Skeleton className="h-8 w-full" />
      <CalendarGrid
        headings={WEEKDAY_HEADINGS}
        openHour={openHour}
        closeHour={closeHour}
        renderCell={() => <Skeleton className="h-9 w-full" />}
      />
    </div>
  );
}
