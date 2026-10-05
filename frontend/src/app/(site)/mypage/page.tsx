import type { Metadata } from "next";
import { Accordion } from "@/components/ui/Accordion";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { MyReservationList } from "@/features/reservations/components/MyReservationList";

export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false },
};

// 開発時の instant 検証はログインしていない状態で描画するため、RequireUser の redirect で必ず止まる
export const instant = false;

export default function MypagePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <section className="space-y-4">
        <h2 className="text-xl font-bold">今後の予約</h2>
        <MyReservationList />
      </section>
      <Accordion title="プロフィール設定">
        <ProfileForm />
      </Accordion>
    </div>
  );
}
