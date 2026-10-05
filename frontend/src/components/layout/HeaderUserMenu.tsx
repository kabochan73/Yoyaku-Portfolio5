"use client";

import Link from "next/link";
import { buttonClassName, Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useLogout } from "@/features/auth/logic/hooks";

const small = { size: "sm" } as const;

export function HeaderUserMenu() {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  if (isPending) {
    return (
      <div className="flex gap-2" data-testid="header-user-menu-loading">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  // 取得に失敗したときもゲストと同じ表示にする。ヘッダーでエラーを出しても利用者にはどうしようもない
  if (!user) {
    return (
      <nav className="flex gap-2">
        <Link
          href="/login"
          className={`${buttonClassName({ ...small, variant: "secondary" })} w-20`}
        >
          ログイン
        </Link>
        <Link href="/register" className={`${buttonClassName(small)} w-20`}>
          新規登録
        </Link>
      </nav>
    );
  }

  const home =
    user.role === "admin"
      ? { href: "/admin", label: "管理者ページ" }
      : { href: "/mypage", label: "マイページ" };

  return (
    <nav className="flex gap-2">
      <Link
        href={home.href}
        className={`${buttonClassName({ ...small, variant: "secondary" })} min-w-20`}
      >
        {home.label}
      </Link>
      <Button
        {...small}
        variant="secondary"
        className="w-20"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        ログアウト
      </Button>
    </nav>
  );
}
