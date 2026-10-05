import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面",
  robots: { index: false },
};

// 開発時の instant 検証はログインしていない状態で描画するため、RequireUser の redirect で必ず止まる
export const instant = false;

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold">管理画面</h1>
    </div>
  );
}
