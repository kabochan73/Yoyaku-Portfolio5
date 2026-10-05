"use client";

import Link from "next/link";
import { buttonClassName, Button } from "@/components/ui/Button";
import { useCurrentUser, useLogout } from "@/features/auth/logic/hooks";

const small = { size: "sm" } as const;

export function HeaderUserMenu() {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  if (isPending) {
    return null;
  }

  // 取得に失敗したときもゲストと同じ表示にする。ヘッダーでエラーを出しても利用者にはどうしようもない
  if (!user) {
    return (
      <nav className="flex gap-2">
        <Link
          href="/login"
          className={`${buttonClassName({ ...small, variant: "secondary" })} w-24`}
        >
          ログイン
        </Link>
        <Link href="/register" className={`${buttonClassName(small)} w-24`}>
          新規登録
        </Link>
      </nav>
    );
  }

  const home =
    user.role === "admin"
      ? { href: "/admin", label: "管理者" }
      : { href: "/mypage", label: "My Page" };

  return (
    <nav className="flex gap-2">
      <Link
        href={home.href}
        className={`${buttonClassName({ ...small, variant: "secondary" })} min-w-24`}
      >
        {home.label}
      </Link>
      <Button
        {...small}
        variant="secondary"
        className="w-24"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        ログアウト
      </Button>
    </nav>
  );
}
