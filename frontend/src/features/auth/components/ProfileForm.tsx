"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { applyServerErrors } from "@/lib/form-errors";
import { useCurrentUser, useUpdateProfile } from "../logic/hooks";
import { profileSchema, type ProfileInput } from "../logic/schemas";
import type { User } from "../logic/types";

const EMPTY_PASSWORDS = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

// ログイン確認を通ったページでだけ使うので、ユーザーは UserProvider がもう入れている
export function ProfileForm() {
  const { data: user } = useCurrentUser();

  return user ? <ProfileFormFields user={user} /> : null;
}

function ProfileFormFields({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email, ...EMPTY_PASSWORDS },
  });

  const onSubmit = handleSubmit(async (input) => {
    setSaved(false);
    try {
      const updated = await updateProfile.mutateAsync(input);
      reset({ name: updated.name, email: updated.email, ...EMPTY_PASSWORDS });
      setSaved(true);
    } catch (error) {
      applyServerErrors(setError, error, [
        "name",
        "email",
        "current_password",
        "password",
        "password_confirmation",
      ]);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      noValidate
      className="space-y-4"
    >
      {saved && <Alert tone="success">プロフィールを更新しました。</Alert>}
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
      <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
        <legend className="pr-2 text-sm text-zinc-500">
          パスワードを変えるときだけ入力してください
        </legend>
        <FormField
          label="現在のパスワード"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register("current_password")}
        />
        <FormField
          label="新しいパスワード（8文字以上）"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          label="新しいパスワード（確認）"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register("password_confirmation")}
        />
      </fieldset>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "更新中..." : "更新する"}
      </Button>
    </form>
  );
}
