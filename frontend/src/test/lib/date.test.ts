import { addDays, dayOfWeek, mondayOf, todayInTokyo } from "@/lib/date";

describe("todayInTokyo", () => {
  test("端末の時刻設定に関係なく、日本時間の今日を返す", () => {
    // 日本時間 10/6 8:00 = ロサンゼルス時間 10/5 16:00
    const now = new Date("2026-10-06T08:00:00+09:00");

    expect(now.getDate()).toBe(5);
    expect(todayInTokyo(now)).toBe("2026-10-06");
  });

  test("日本時間の 0 時ちょうどから次の日になる", () => {
    expect(todayInTokyo(new Date("2026-10-06T23:59:59+09:00"))).toBe(
      "2026-10-06",
    );
    expect(todayInTokyo(new Date("2026-10-07T00:00:00+09:00"))).toBe(
      "2026-10-07",
    );
  });
});

describe("addDays", () => {
  test.each([
    ["月をまたぐ", "2026-10-31", 1, "2026-11-01"],
    ["年をまたぐ", "2026-12-31", 1, "2027-01-01"],
    ["うるう年の 2/29", "2028-02-28", 1, "2028-02-29"],
    ["マイナス", "2026-10-01", -1, "2026-09-30"],
    ["1週間", "2026-10-05", 7, "2026-10-12"],
  ])("%s", (_, date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  test("夏時間の切り替わりでもずれない", () => {
    // ロサンゼルスは 2026-11-01 に夏時間が終わる
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("dayOfWeek", () => {
  test.each([
    ["2026-10-04", 0],
    ["2026-10-05", 1],
    ["2026-10-10", 6],
  ])("%s は %i", (date, expected) => {
    expect(dayOfWeek(date)).toBe(expected);
  });
});

describe("mondayOf", () => {
  test.each([
    ["月曜はそのまま", "2026-10-05", "2026-10-05"],
    ["水曜", "2026-10-07", "2026-10-05"],
    ["日曜は6日前", "2026-10-11", "2026-10-05"],
    ["月をまたぐ週", "2026-11-01", "2026-10-26"],
  ])("%s", (_, date, expected) => {
    expect(mondayOf(date)).toBe(expected);
  });
});
