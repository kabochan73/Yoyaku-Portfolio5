import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { addDays } from "@/lib/date";
import { CALENDAR_FRESH_MS, CALENDAR_POLL_MS } from "@/lib/query-config";
import { queryKeys } from "@/lib/query-keys";
import { fetchCalendar } from "./api";
import type { InitialCalendar } from "./server";

function calendarWeekOptions(weekStart: string) {
  return queryOptions({
    queryKey: queryKeys.calendar.week(weekStart),
    queryFn: () => fetchCalendar(weekStart, addDays(weekStart, 6)),
    staleTime: CALENDAR_FRESH_MS,
  });
}

export function useCalendar(
  weekStart: string,
  initial: InitialCalendar | null = null,
) {
  const queryClient = useQueryClient();
  const fromServer = initial?.weekStart === weekStart ? initial : null;

  const query = useQuery({
    ...calendarWeekOptions(weekStart),
    refetchInterval: CALENDAR_POLL_MS,
    placeholderData: keepPreviousData,
    initialData: fromServer?.calendar,
    initialDataUpdatedAt: fromServer?.fetchedAt,
  });

  const bookableUntil = query.data?.meta.bookable_until;

  useEffect(() => {
    const nextWeekStart = addDays(weekStart, 7);
    if (bookableUntil === undefined || nextWeekStart > bookableUntil) {
      return;
    }
    void queryClient.prefetchQuery(calendarWeekOptions(nextWeekStart));
  }, [queryClient, weekStart, bookableUntil]);

  return query;
}
