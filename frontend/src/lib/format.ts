import { addDays, dayOfWeek } from "./date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function parts(date: string): { month: number; day: number; year: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

function weekdayOf(date: string): string {
  return WEEKDAYS[dayOfWeek(date)] ?? "";
}

export function formatDateJa(date: string): string {
  const { year, month, day } = parts(date);
  return `${year}年${month}月${day}日（${weekdayOf(date)}）`;
}

export function formatShortDate(date: string): string {
  const { month, day } = parts(date);
  return `${month}/${day}（${weekdayOf(date)}）`;
}

export function formatWeekRange(monday: string): string {
  const start = parts(monday);
  const end = parts(addDays(monday, 6));
  return `${start.month}/${start.day} 〜 ${end.month}/${end.day}`;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatHourRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)} 〜 ${formatHour(endHour)}`;
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

// 0（日）〜 6（土）を月曜始まりに並べる
export function formatWeekdays(days: readonly number[]): string {
  if (days.length === 0) {
    return "なし";
  }
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((day) => `${WEEKDAYS[day] ?? ""}曜日`)
    .join("・");
}
