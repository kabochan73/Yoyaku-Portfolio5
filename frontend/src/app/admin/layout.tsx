import { Suspense } from "react";
import { RequireUser } from "@/features/auth/components/RequireUser";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex-1">
      <Suspense>
        <RequireUser role="admin">{children}</RequireUser>
      </Suspense>
    </main>
  );
}
