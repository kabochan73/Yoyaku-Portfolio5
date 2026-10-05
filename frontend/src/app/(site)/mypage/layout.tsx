import { Suspense } from "react";
import { RequireUser } from "@/features/auth/components/RequireUser";

export default function MypageLayout({ children }: LayoutProps<"/mypage">) {
  return (
    <Suspense>
      <RequireUser role="user">{children}</RequireUser>
    </Suspense>
  );
}
