const tokyoDateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 端末のタイムゾーンに引きずられないよう、日付は UTC の 0 時として扱う
function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayInTokyo(now: Date = new Date()): string {
  return tokyoDateFormat.format(now);
}

export function addDays(date: string, days: number): string {
  const result = toUtc(date);
  result.setUTCDate(result.getUTCDate() + days);
  return fromUtc(result);
}

export function dayOfWeek(date: string): number {
  return toUtc(date).getUTCDay();
}

export function mondayOf(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}
