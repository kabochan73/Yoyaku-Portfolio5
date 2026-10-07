import "server-only";
import { cookies, headers } from "next/headers";
import { env } from "./env";

export async function serverFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  const outgoing = new Headers(init.headers);
  outgoing.set("Accept", "application/json");
  // Sanctum は Referer がフロントのときだけ Cookie のセッションを見る
  outgoing.set("Referer", env.FRONTEND_URL);

  const cookie = cookieStore.toString();
  if (cookie !== "") {
    outgoing.set("Cookie", cookie);
  }

  // 利用者の IP を backend に伝える。Railway では X-Real-IP に入る（backend は X-Real-IP を優先する）
  for (const name of ["X-Forwarded-For", "X-Real-IP"]) {
    const value = requestHeaders.get(name);
    if (value !== null) {
      outgoing.set(name, value);
    }
  }

  return fetch(`${env.API_URL}${path}`, {
    ...init,
    headers: outgoing,
    cache: "no-store",
  });
}
