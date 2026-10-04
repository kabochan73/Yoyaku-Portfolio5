import "server-only";
import { connection } from "next/server";
import { addDays, mondayOf, todayInTokyo } from "@/lib/date";
import { serverFetch } from "@/lib/server-fetch";
import type { Calendar } from "./types";

export type InitialCalendar = {
  weekStart: string;
  calendar: Calendar;
  fetchedAt: number;
};

// 取れなかったときは null を返し、ブラウザで取り直させる
export async function getCalendar(): Promise<InitialCalendar | null> {
  // Cache Components では、リクエストを受けるまで現在時刻を読めない
  await connection();

  const weekStart = mondayOf(todayInTokyo());

  try {
    const response = await serverFetch(
      `/calendar?from=${weekStart}&to=${addDays(weekStart, 6)}`,
    );
    if (!response.ok) {
      return null;
    }

    return {
      weekStart,
      calendar: (await response.json()) as Calendar,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
