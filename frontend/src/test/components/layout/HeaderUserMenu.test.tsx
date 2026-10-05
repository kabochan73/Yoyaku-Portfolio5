import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { HeaderUserMenu } from "@/components/layout/HeaderUserMenu";
import type { User } from "@/features/auth/logic/types";
import { reloadTo } from "@/lib/navigation";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

jest.mock("@/lib/navigation", () => ({ reloadTo: jest.fn() }));

const member: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};
const admin: User = { ...member, id: 2, name: "管理者", role: "admin" };

function respondUser(user: User | null) {
  server.use(
    http.get("/api/user", () =>
      user
        ? HttpResponse.json({ data: user })
        : HttpResponse.json(
            { message: "ログインしてください。", code: "unauthenticated" },
            { status: 401 },
          ),
    ),
  );
}

function linkNames() {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

beforeEach(() => {
  jest.mocked(reloadTo).mockClear();
});

test("取得中はボタン2つ分のスケルトン", () => {
  respondUser(null);
  renderWithClient(<HeaderUserMenu />);

  expect(screen.getByTestId("header-user-menu-loading")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("ゲストには、ログインと新規登録", async () => {
  respondUser(null);
  renderWithClient(<HeaderUserMenu />);

  expect(await screen.findByRole("link", { name: "ログイン" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
    "href",
    "/register",
  );
  expect(screen.queryByRole("button", { name: "ログアウト" })).toBeNull();
});

test("取得に失敗したときも、ゲストと同じ表示", async () => {
  server.use(
    http.get("/api/user", () => new HttpResponse(null, { status: 500 })),
  );
  renderWithClient(<HeaderUserMenu />);

  await screen.findByRole("link", { name: "ログイン" });
  expect(linkNames()).toEqual(["ログイン", "新規登録"]);
});

test("会員には、マイページとログアウト", async () => {
  respondUser(member);
  renderWithClient(<HeaderUserMenu />);

  expect(
    await screen.findByRole("link", { name: "マイページ" }),
  ).toHaveAttribute("href", "/mypage");
  expect(linkNames()).toEqual(["マイページ"]);
  expect(screen.getByRole("button", { name: "ログアウト" })).toBeEnabled();
});

test("管理者には、管理者ページとログアウト", async () => {
  respondUser(admin);
  renderWithClient(<HeaderUserMenu />);

  expect(
    await screen.findByRole("link", { name: "管理者ページ" }),
  ).toHaveAttribute("href", "/admin");
  expect(linkNames()).toEqual(["管理者ページ"]);
});

test("ログアウト中はボタンを押せず、終わったらトップを読み直す", async () => {
  let release = () => {};
  respondUser(member);
  server.use(
    http.post("/api/logout", async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderWithClient(<HeaderUserMenu />);

  await userEvent.click(
    await screen.findByRole("button", { name: "ログアウト" }),
  );

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeDisabled(),
  );
  expect(reloadTo).not.toHaveBeenCalled();

  release();

  await waitFor(() => expect(reloadTo).toHaveBeenCalledWith("/"));
});
