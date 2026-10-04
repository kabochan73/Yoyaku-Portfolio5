import {
  formatDateJa,
  formatHour,
  formatHourRange,
  formatShortDate,
  formatWeekRange,
  formatYen,
} from "@/lib/format";

test("formatDateJa は曜日付きの長い日付", () => {
  expect(formatDateJa("2026-10-06")).toBe("2026年10月6日（火）");
});

test("formatShortDate は曜日付きの短い日付", () => {
  expect(formatShortDate("2026-10-11")).toBe("10/11（日）");
});

test("formatWeekRange は月曜から日曜まで", () => {
  expect(formatWeekRange("2026-10-26")).toBe("10/26 〜 11/1");
});

test.each([
  [9, "09:00"],
  [10, "10:00"],
  [22, "22:00"],
])("formatHour(%i) は %s", (hour, expected) => {
  expect(formatHour(hour)).toBe(expected);
});

test("formatHourRange は開始と終了", () => {
  expect(formatHourRange(10, 12)).toBe("10:00 〜 12:00");
});

test.each([
  [0, "¥0"],
  [8000, "¥8,000"],
  [1234567, "¥1,234,567"],
])("formatYen(%i) は %s", (amount, expected) => {
  expect(formatYen(amount)).toBe(expected);
});
