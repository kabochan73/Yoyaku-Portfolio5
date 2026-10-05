import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../logic/server";

export async function RequireGuest({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/");
  }

  return children;
}
