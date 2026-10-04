import type { Facility } from "@/features/facility/logic/types";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import type {
  AdminCalendar,
  AdminReservation,
  AdminUser,
  Holiday,
  NewHoliday,
  NewPhoneReservation,
  Prices,
} from "./types";

export async function fetchAdminCalendar(
  from: string,
  to: string,
): Promise<AdminCalendar> {
  const { data } = await api.get<AdminCalendar>("/admin/calendar", {
    params: { from, to },
  });
  return data;
}

export async function createPhoneReservation(
  input: NewPhoneReservation,
): Promise<AdminReservation> {
  const { data } = await api.post<{ data: AdminReservation }>(
    "/admin/reservations",
    input,
  );
  return data.data;
}

export async function cancelReservationAsAdmin(
  id: number,
): Promise<AdminReservation> {
  const { data } = await api.post<{ data: AdminReservation }>(
    `/admin/reservations/${id}/cancel`,
  );
  return data.data;
}

export async function updatePrices(input: Prices): Promise<Facility> {
  const { data } = await api.put<{ data: Facility }>("/admin/prices", input);
  return data.data;
}

export async function updateRegularHolidays(days: number[]): Promise<Facility> {
  const { data } = await api.put<{ data: Facility }>(
    "/admin/regular-holidays",
    { days },
  );
  return data.data;
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const { data } = await api.get<{ data: Holiday[] }>("/admin/holidays");
  return data.data;
}

export async function createHoliday(input: NewHoliday): Promise<Holiday> {
  const { data } = await api.post<{ data: Holiday }>("/admin/holidays", input);
  return data.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await api.delete(`/admin/holidays/${id}`);
}

export async function searchUsers(search: string): Promise<AdminUser[]> {
  const { data } = await api.get<{ data: AdminUser[] }>("/admin/users", {
    params: { search },
  });
  return data.data;
}

// 予約が入っている日を休業日にしようとして断られたときだけ、その件数を返す
export function reservationCountOf(error: unknown): number | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== "holiday_has_reservations"
  ) {
    return null;
  }
  const body = error.body as { reservation_count?: unknown } | null;
  return typeof body?.reservation_count === "number"
    ? body.reservation_count
    : null;
}
