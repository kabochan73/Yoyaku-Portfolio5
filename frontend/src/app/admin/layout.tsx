import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { RequireUser } from "@/features/auth/components/RequireUser";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<PageSkeleton />}>
        <RequireUser role="admin">{children}</RequireUser>
      </Suspense>
    </main>
  );
}
