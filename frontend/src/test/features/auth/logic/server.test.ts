import { http, HttpResponse } from "msw";
import { getCurrentUser } from "@/features/auth/logic/server";
import { server } from "@/test/msw/server";

jest.mock("next/headers", () => ({
  cookies: async () => ({ toString: (): string => "laravel_session=abc" }),
  headers: async () => new Headers(),
}));

const taro = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};

test("ログインしていればユーザーを返す", async () => {
  server.use(
    http.get("http://api.test/api/user", () =>
      HttpResponse.json({ data: taro }),
    ),
  );

  expect(await getCurrentUser()).toEqual(taro);
});

test("401 なら null", async () => {
  server.use(
    http.get("http://api.test/api/user", () =>
      HttpResponse.json({ code: "unauthenticated" }, { status: 401 }),
    ),
  );

  expect(await getCurrentUser()).toBeNull();
});

test("それ以外のエラーなら止まる", async () => {
  server.use(
    http.get(
      "http://api.test/api/user",
      () => new HttpResponse(null, { status: 500 }),
    ),
  );

  await expect(getCurrentUser()).rejects.toThrow("500");
});
