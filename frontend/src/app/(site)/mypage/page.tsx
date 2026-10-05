import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false },
};

// 開発時の instant 検証はログインしていない状態で描画するため、RequireUser の redirect で必ず止まる
export const instant = false;

export default function MypagePage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold">マイページ</h1>
    </div>
  );
}
