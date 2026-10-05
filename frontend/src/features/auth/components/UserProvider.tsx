"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { queryKeys } from "@/lib/query-keys";
import { useCurrentUser } from "../logic/hooks";
import type { User } from "../logic/types";

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: User;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // 最初の描画の前に1回だけ入れる。useEffect だと未ログインの表示が一瞬出る
  useState(() => queryClient.setQueryData(queryKeys.user, initialUser));

  // どこかの API が 401 を返すと、QueryClient がユーザーを null にする（セッション切れ）
  const { data: user } = useCurrentUser();
  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  return children;
}
