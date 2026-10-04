import { api } from "@/lib/api-client";
import type { Calendar } from "./types";

export async function fetchCalendar(
  from: string,
  to: string,
): Promise<Calendar> {
  const { data } = await api.get<Calendar>("/calendar", {
    params: { from, to },
  });
  return data;
}
