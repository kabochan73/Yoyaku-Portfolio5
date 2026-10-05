import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "会員登録" };

export default function RegisterPage() {
  return (
    <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
      <h1 className="text-2xl font-bold">会員登録</h1>
      <RegisterForm />
      <p className="text-center text-sm text-zinc-500">
        アカウントをお持ちの方は{" "}
        <Link href="/login" className="text-primary hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
