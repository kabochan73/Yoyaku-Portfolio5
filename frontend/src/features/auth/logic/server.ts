import "server-only";
import { cache } from "react";
import { serverFetch } from "@/lib/server-fetch";
import type { User } from "./types";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const response = await serverFetch("/user");

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch the current user: ${response.status}`);
  }

  const body = (await response.json()) as { data: User };
  return body.data;
});
