import { z } from "zod";

const name = z
  .string()
  .min(1, "名前を入力してください。")
  .max(20, "名前は20文字以内で入力してください。");

const email = z
  .string()
  .min(1, "メールアドレスを入力してください。")
  .pipe(z.email("メールアドレスの形式で入力してください。"));

const PASSWORD_TOO_SHORT = "パスワードは8文字以上で入力してください。";
const PASSWORD_MISMATCH = "パスワードが確認用と一致しません。";

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "パスワードを入力してください。"),
});

export const registerSchema = z
  .object({
    name,
    email,
    password: z.string().min(8, PASSWORD_TOO_SHORT),
    password_confirmation: z.string(),
  })
  .refine((input) => input.password === input.password_confirmation, {
    path: ["password_confirmation"],
    message: PASSWORD_MISMATCH,
  });

export const profileSchema = z
  .object({
    name,
    email,
    current_password: z.string(),
    password: z.string(),
    password_confirmation: z.string(),
  })
  .superRefine((input, ctx) => {
    if (input.password === "") {
      return;
    }
    if (input.password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: PASSWORD_TOO_SHORT,
      });
    }
    if (input.password !== input.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirmation"],
        message: PASSWORD_MISMATCH,
      });
    }
    if (input.current_password === "") {
      ctx.addIssue({
        code: "custom",
        path: ["current_password"],
        message: "現在のパスワードを入力してください。",
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
