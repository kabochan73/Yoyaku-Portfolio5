import { Suspense } from "react";
import { RequireGuest } from "@/features/auth/components/RequireGuest";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <Suspense>
          <RequireGuest>{children}</RequireGuest>
        </Suspense>
      </div>
    </main>
  );
}
