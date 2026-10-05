"use client";

import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/Button";

// 本番ではサーバー側のエラーの中身は届かないので、画面には出さない
export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">ページを表示できませんでした</h1>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>再読み込み</Button>
        <Link href="/" className={buttonClassName({ variant: "secondary" })}>
          トップページへ戻る
        </Link>
      </div>
    </main>
  );
}
