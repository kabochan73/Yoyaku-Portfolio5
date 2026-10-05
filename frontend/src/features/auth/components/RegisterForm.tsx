"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { applyServerErrors } from "@/lib/form-errors";
import { useRegister } from "../logic/hooks";
import { registerSchema, type RegisterInput } from "../logic/schemas";

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await registerUser.mutateAsync(input);
      router.replace("/");
    } catch (error) {
      applyServerErrors(setError, error, [
        "name",
        "email",
        "password",
        "password_confirmation",
      ]);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root?.server && (
        <Alert tone="error">{errors.root.server.message}</Alert>
      )}
      <FormField
        label="名前"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormField
        label="メールアドレス"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label="パスワード（8文字以上）"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        label="パスワード（確認）"
        type="password"
        autoComplete="new-password"
        error={errors.password_confirmation?.message}
        {...register("password_confirmation")}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "登録中..." : "登録する"}
      </Button>
    </form>
  );
}
