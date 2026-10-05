import { Skeleton } from "@/components/ui/Skeleton";
import { CalendarGrid } from "./CalendarGrid";

// 週が分からないので、見出しの曜日・日付もスケルトンにする
const HEADINGS = Array.from({ length: 7 }, (_, i) => (
  <Skeleton key={i} className="mx-auto h-12 w-8" />
));

export function CalendarSkeleton({
  openHour,
  closeHour,
}: {
  openHour: number;
  closeHour: number;
}) {
  return (
    <div data-testid="calendar-skeleton">
      <CalendarGrid
        headings={HEADINGS}
        openHour={openHour}
        closeHour={closeHour}
        renderCell={() => <Skeleton className="h-6 w-full" />}
      />
    </div>
  );
}
