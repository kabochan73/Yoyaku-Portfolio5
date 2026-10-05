import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { RequireUser } from "@/features/auth/components/RequireUser";

export default function MypageLayout({ children }: LayoutProps<"/mypage">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RequireUser role="user">{children}</RequireUser>
    </Suspense>
  );
}
