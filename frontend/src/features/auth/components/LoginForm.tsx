"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { applyServerErrors } from "@/lib/form-errors";
import { useLogin } from "../logic/hooks";
import { loginSchema, type LoginInput } from "../logic/schemas";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const user = await login.mutateAsync(input);
      // 「戻る」でログイン画面に戻らないよう replace にする
      router.replace(user.role === "admin" ? "/admin" : "/");
    } catch (error) {
      applyServerErrors(setError, error, ["email", "password"]);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root?.server && (
        <Alert tone="error">{errors.root.server.message}</Alert>
      )}
      <FormField
        label="メールアドレス"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label="パスワード"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}
