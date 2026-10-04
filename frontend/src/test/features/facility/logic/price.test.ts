import { estimatePrice } from "@/features/facility/logic/price";

const facility = { prices: { weekday: 4000, weekend: 5000 } };

test.each([
  ["平日 2時間", "2026-10-09", 10, 12, 8000],
  ["土曜 4時間", "2026-10-10", 10, 14, 20000],
  ["日曜 3時間", "2026-10-11", 18, 21, 15000],
  ["月曜は平日", "2026-10-12", 10, 12, 8000],
])("%s", (_, date, start, end, price) => {
  expect(estimatePrice(facility, date, start, end)).toBe(price);
});
