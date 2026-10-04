import type { z } from "zod";
import {
  loginSchema,
  profileSchema,
  registerSchema,
} from "@/features/auth/logic/schemas";

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

describe("loginSchema", () => {
  test("正しい入力は通る", () => {
    expect(
      errorsOf(loginSchema, { email: "taro@example.com", password: "x" }),
    ).toEqual({});
  });

  test("空とメールアドレスの形式", () => {
    expect(errorsOf(loginSchema, { email: "", password: "" })).toEqual({
      email: "メールアドレスを入力してください。",
      password: "パスワードを入力してください。",
    });
    expect(errorsOf(loginSchema, { email: "taro", password: "x" }).email).toBe(
      "メールアドレスの形式で入力してください。",
    );
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "山田太郎",
    email: "taro@example.com",
    password: "password123",
    password_confirmation: "password123",
  };

  test("正しい入力は通る", () => {
    expect(errorsOf(registerSchema, valid)).toEqual({});
  });

  test.each([
    ["名前が空", { name: "" }, "name", "名前を入力してください。"],
    [
      "名前が21文字",
      { name: "あ".repeat(21) },
      "name",
      "名前は20文字以内で入力してください。",
    ],
    [
      "パスワードが7文字",
      { password: "1234567", password_confirmation: "1234567" },
      "password",
      "パスワードは8文字以上で入力してください。",
    ],
    [
      "確認と違う",
      { password_confirmation: "different123" },
      "password_confirmation",
      "パスワードが確認用と一致しません。",
    ],
  ])("%s", (_, overrides, field, message) => {
    expect(errorsOf(registerSchema, { ...valid, ...overrides })[field]).toBe(
      message,
    );
  });
});

describe("profileSchema", () => {
  const base = {
    name: "山田太郎",
    email: "taro@example.com",
    current_password: "",
    password: "",
    password_confirmation: "",
  };

  test("パスワードが空なら、今のパスワードは要らない", () => {
    expect(errorsOf(profileSchema, base)).toEqual({});
  });

  test("パスワードを入れたら、今のパスワード・8文字以上・確認が必要", () => {
    expect(
      errorsOf(profileSchema, {
        ...base,
        password: "short",
        password_confirmation: "other",
      }),
    ).toEqual({
      password: "パスワードは8文字以上で入力してください。",
      password_confirmation: "パスワードが確認用と一致しません。",
      current_password: "現在のパスワードを入力してください。",
    });
  });

  test("すべてそろえば通る", () => {
    expect(
      errorsOf(profileSchema, {
        ...base,
        current_password: "password",
        password: "new-password",
        password_confirmation: "new-password",
      }),
    ).toEqual({});
  });
});
