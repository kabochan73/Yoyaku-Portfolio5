import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Facility } from "@/features/facility/logic/types";
import { addDays } from "@/lib/date";
import { CALENDAR_FRESH_MS, CALENDAR_POLL_MS } from "@/lib/query-config";
import { queryKeys } from "@/lib/query-keys";
import {
  cancelReservationAsAdmin,
  createHoliday,
  createPhoneReservation,
  deleteHoliday,
  fetchAdminCalendar,
  fetchHolidays,
  searchUsers,
  updatePrices,
  updateRegularHolidays,
} from "./api";

export function useAdminCalendar(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.admin.calendar.week(weekStart),
    queryFn: () => fetchAdminCalendar(weekStart, addDays(weekStart, 6)),
    staleTime: CALENDAR_FRESH_MS,
    refetchInterval: CALENDAR_POLL_MS,
    placeholderData: keepPreviousData,
  });
}

function useRefreshCalendars() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.calendar.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
    ]);
}

export function useCreatePhoneReservation() {
  const refreshCalendars = useRefreshCalendars();
  return useMutation({
    mutationFn: createPhoneReservation,
    onSettled: refreshCalendars,
  });
}

export function useCancelReservationAsAdmin() {
  const refreshCalendars = useRefreshCalendars();
  return useMutation({
    mutationFn: cancelReservationAsAdmin,
    // 開始済み・キャンセル済みで断られたときもカレンダーが古いので、取り直して最新にする
    onSettled: refreshCalendars,
  });
}

function useSetFacility() {
  const queryClient = useQueryClient();
  return (facility: Facility) =>
    queryClient.setQueryData(queryKeys.facility, facility);
}

export function useUpdatePrices() {
  const setFacility = useSetFacility();
  return useMutation({ mutationFn: updatePrices, onSuccess: setFacility });
}

export function useUpdateRegularHolidays() {
  const setFacility = useSetFacility();
  const refreshCalendars = useRefreshCalendars();
  return useMutation({
    mutationFn: updateRegularHolidays,
    onSuccess: (facility) => {
      setFacility(facility);
      return refreshCalendars();
    },
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: queryKeys.admin.holidays,
    queryFn: fetchHolidays,
  });
}

function useRefreshHolidays() {
  const queryClient = useQueryClient();
  const refreshCalendars = useRefreshCalendars();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.holidays }),
      refreshCalendars(),
    ]);
}

export function useCreateHoliday() {
  const refreshHolidays = useRefreshHolidays();
  return useMutation({ mutationFn: createHoliday, onSuccess: refreshHolidays });
}

export function useDeleteHoliday() {
  const refreshHolidays = useRefreshHolidays();
  return useMutation({ mutationFn: deleteHoliday, onSuccess: refreshHolidays });
}

export function useSearchUsers(search: string) {
  const keyword = search.trim();
  return useQuery({
    queryKey: queryKeys.admin.users(keyword),
    queryFn: () => searchUsers(keyword),
    enabled: keyword !== "",
    placeholderData: keepPreviousData,
  });
}
