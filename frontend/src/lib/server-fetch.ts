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

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor !== null) {
    outgoing.set("X-Forwarded-For", forwardedFor);
  }

  return fetch(`${env.API_URL}${path}`, {
    ...init,
    headers: outgoing,
    cache: "no-store",
  });
}
