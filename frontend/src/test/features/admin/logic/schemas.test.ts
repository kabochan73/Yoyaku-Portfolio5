import type { z } from "zod";
import {
  holidaySchema,
  phoneReservationSchema,
  pricesSchema,
} from "@/features/admin/logic/schemas";

function errorsOf(
  schema: z.ZodType,
  input: unknown,
): Record<string, string | undefined> {
  const result = schema.safeParse(input);
  if (result.success) {
    return {};
  }
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("phoneReservationSchema", () => {
  test("前後の空白を除いた名前になる", () => {
    expect(phoneReservationSchema.parse({ booker_name: " 佐藤 " })).toEqual({
      booker_name: "佐藤",
    });
  });

  test("空（空白だけも含む）と長すぎ", () => {
    expect(errorsOf(phoneReservationSchema, { booker_name: "  " })).toEqual({
      booker_name: "予約者名を入力してください。",
    });
    expect(
      errorsOf(phoneReservationSchema, { booker_name: "あ".repeat(256) }),
    ).toEqual({ booker_name: "予約者名は255文字以内で入力してください。" });
  });
});

describe("pricesSchema", () => {
  test("数字の文字列が数値になる（0も可）", () => {
    expect(pricesSchema.parse({ weekday: "5000", weekend: "0" })).toEqual({
      weekday: 5000,
      weekend: 0,
    });
  });

  test("空欄はそれぞれの項目のエラー", () => {
    expect(errorsOf(pricesSchema, { weekday: "", weekend: "" })).toEqual({
      weekday: "平日料金を入力してください。",
      weekend: "土日料金を入力してください。",
    });
  });

  test.each(["1.5", "-1", "abc", "1e3"])("「%s」は弾く", (value) => {
    expect(errorsOf(pricesSchema, { weekday: value, weekend: "5000" })).toEqual(
      { weekday: "平日料金は0以上の整数で入力してください。" },
    );
  });
});

describe("holidaySchema", () => {
  test("理由が空欄なら null になる", () => {
    expect(holidaySchema.parse({ date: "2026-10-20", reason: "  " })).toEqual({
      date: "2026-10-20",
      reason: null,
    });
    expect(
      holidaySchema.parse({ date: "2026-10-20", reason: "設備点検" }),
    ).toEqual({ date: "2026-10-20", reason: "設備点検" });
  });

  test("日付が空、形がおかしい、理由が長すぎ", () => {
    expect(errorsOf(holidaySchema, { date: "", reason: "" })).toEqual({
      date: "日付を選んでください。",
    });
    expect(
      errorsOf(holidaySchema, { date: "2026/10/20", reason: "" }).date,
    ).toBe("日付の形式が正しくありません。");
    expect(
      errorsOf(holidaySchema, { date: "2026-10-20", reason: "あ".repeat(256) }),
    ).toEqual({ reason: "理由は255文字以内で入力してください。" });
  });
});
