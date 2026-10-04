"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "../logic/types";

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: User;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  // 最初の描画の前に1回だけ入れる。useEffect だと未ログインの表示が一瞬出る
  useState(() => queryClient.setQueryData(queryKeys.user, initialUser));

  return children;
}
