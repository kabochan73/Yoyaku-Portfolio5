import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { RequireGuest } from "@/features/auth/components/RequireGuest";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <Suspense fallback={<PageSkeleton />}>
          <RequireGuest>{children}</RequireGuest>
        </Suspense>
      </div>
    </main>
  );
}
