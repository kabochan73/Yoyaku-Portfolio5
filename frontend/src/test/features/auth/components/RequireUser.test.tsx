import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { RequireGuest } from "@/features/auth/components/RequireGuest";
import { RequireUser } from "@/features/auth/components/RequireUser";
import { UserProvider } from "@/features/auth/components/UserProvider";
import { getCurrentUser } from "@/features/auth/logic/server";
import type { User } from "@/features/auth/logic/types";

jest.mock("@/features/auth/logic/server", () => ({
  getCurrentUser: jest.fn(),
}));

// 本物の redirect も例外を投げて描画を止める
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

const member: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};
const admin: User = { ...member, id: 2, role: "admin" };
const content = <p>中身</p>;

function signedInAs(user: User | null) {
  jest.mocked(getCurrentUser).mockResolvedValue(user);
}

beforeEach(() => {
  jest.mocked(redirect).mockClear();
});

describe("RequireUser", () => {
  test.each([
    ["会員だけのページに、未ログインで来たら /login", "user", null, "/login"],
    ["会員だけのページに、管理者で来たら /admin", "user", admin, "/admin"],
    [
      "管理者だけのページに、未ログインで来たら /login",
      "admin",
      null,
      "/login",
    ],
    ["管理者だけのページに、会員で来たら /", "admin", member, "/"],
  ] as const)("%s", async (_, role, user, path) => {
    signedInAs(user);

    await expect(RequireUser({ role, children: content })).rejects.toThrow(
      `redirect:${path}`,
    );
  });

  test.each([
    ["会員", "user", member],
    ["管理者", "admin", admin],
  ] as const)(
    "%sなら、ユーザーを UserProvider に渡して中身を出す",
    async (_, role, user) => {
      signedInAs(user);

      const element = (await RequireUser({
        role,
        children: content,
      })) as ReactElement<{ initialUser: User; children: unknown }>;

      expect(redirect).not.toHaveBeenCalled();
      expect(element.type).toBe(UserProvider);
      expect(element.props.initialUser).toEqual(user);
      expect(element.props.children).toBe(content);
    },
  );
});

describe("RequireGuest", () => {
  test.each([
    ["会員なら /", member, "/"],
    ["管理者なら /admin", admin, "/admin"],
  ] as const)("%s", async (_, user, path) => {
    signedInAs(user);

    await expect(RequireGuest({ children: content })).rejects.toThrow(
      `redirect:${path}`,
    );
  });

  test("未ログインなら中身を出す", async () => {
    signedInAs(null);

    expect(await RequireGuest({ children: content })).toBe(content);
    expect(redirect).not.toHaveBeenCalled();
  });
});
