import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">
        お探しのページは見つかりませんでした
      </h1>
      <Link href="/" className={buttonClassName({ variant: "secondary" })}>
        トップページへ戻る
      </Link>
    </main>
  );
}
