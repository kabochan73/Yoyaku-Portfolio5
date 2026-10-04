import { dayOfWeek } from "@/lib/date";
import type { Facility } from "./types";

export function estimatePrice(
  facility: Pick<Facility, "prices">,
  date: string,
  startHour: number,
  endHour: number,
): number {
  const day = dayOfWeek(date);
  const unitPrice =
    day === 0 || day === 6 ? facility.prices.weekend : facility.prices.weekday;

  return unitPrice * (endHour - startHour);
}
