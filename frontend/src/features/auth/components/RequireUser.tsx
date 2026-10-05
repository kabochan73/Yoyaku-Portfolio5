import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "../logic/server";
import type { Role } from "../logic/types";
import { UserProvider } from "./UserProvider";

// 画面の出し分けのためで、守りではない。守りは API 側の auth:sanctum と can:admin
export async function RequireUser({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role !== role) {
    redirect(user.role === "admin" ? "/admin" : "/");
  }

  return <UserProvider initialUser={user}>{children}</UserProvider>;
}
