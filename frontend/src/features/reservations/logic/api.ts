import { api } from "@/lib/api-client";
import type { NewReservation, Reservation } from "./types";

export async function fetchMyReservations(): Promise<Reservation[]> {
  const { data } = await api.get<{ data: Reservation[] }>("/user/reservations");
  return data.data;
}

export async function createReservation(
  input: NewReservation,
): Promise<Reservation> {
  const { data } = await api.post<{ data: Reservation }>(
    "/reservations",
    input,
  );
  return data.data;
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const { data } = await api.post<{ data: Reservation }>(
    `/reservations/${id}/cancel`,
  );
  return data.data;
}
