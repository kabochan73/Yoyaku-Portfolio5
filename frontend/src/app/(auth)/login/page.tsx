import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <LoginForm />
      <p className="text-center text-sm text-zinc-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="text-primary hover:underline">
          会員登録
        </Link>
      </p>
    </div>
  );
}
