import { z } from "zod";

export const phoneReservationSchema = z.object({
  booker_name: z
    .string()
    .trim()
    .min(1, "予約者名を入力してください。")
    .max(255, "予約者名は255文字以内で入力してください。"),
});

const price = (label: string) =>
  z
    .string()
    .min(1, { error: `${label}を入力してください。`, abort: true })
    .regex(/^\d+$/, `${label}は0以上の整数で入力してください。`)
    .transform(Number);

export const pricesSchema = z.object({
  weekday: price("平日料金"),
  weekend: price("土日料金"),
});

export const holidaySchema = z.object({
  date: z
    .string()
    .min(1, { error: "日付を選んでください。", abort: true })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません。"),
  reason: z
    .string()
    .trim()
    .max(255, "理由は255文字以内で入力してください。")
    .transform((reason) => (reason === "" ? null : reason)),
});

export type PhoneReservationInput = z.infer<typeof phoneReservationSchema>;
export type PricesInput = z.input<typeof pricesSchema>;
export type PricesOutput = z.output<typeof pricesSchema>;
export type HolidayInput = z.input<typeof holidaySchema>;
export type HolidayOutput = z.output<typeof holidaySchema>;
