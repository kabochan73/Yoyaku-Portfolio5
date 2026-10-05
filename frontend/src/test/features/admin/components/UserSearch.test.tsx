import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { UserSearch } from "@/features/admin/components/UserSearch";
import type { AdminUser } from "@/features/admin/logic/types";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

function userOf(id: number, name: string): AdminUser {
  return {
    id,
    name,
    email: `user${id}@example.com`,
    confirmed_reservations_count: id % 3,
  };
}

let searched: string[] = [];

function respondUsers(
  usersOf: (search: string) => AdminUser[] | Response | Promise<Response>,
) {
  server.use(
    http.get("/api/admin/users", async ({ request }) => {
      const search = new URL(request.url).searchParams.get("search") ?? "";
      searched.push(search);
      const users = await usersOf(search);
      return users instanceof Response
        ? users
        : HttpResponse.json({ data: users, meta: { limit: 20 } });
    }),
  );
}

function input() {
  return screen.getByLabelText("名前またはメールアドレス");
}

beforeEach(() => {
  searched = [];
  respondUsers((search) => [userOf(1, `${search}太郎`)]);
});

test("未入力なら、検索できることを案内する", () => {
  renderWithClient(<UserSearch />);

  expect(
    screen.getByText("名前またはメールアドレスで検索できます。"),
  ).toBeInTheDocument();
});

test("1文字ごとには検索せず、打ち終わって 300ms たってから1回だけ検索する", async () => {
  jest.useFakeTimers({ advanceTimers: true });
  try {
    renderWithClient(<UserSearch />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.type(input(), "山田");
    await act(() => jest.advanceTimersByTimeAsync(299));
    expect(searched).toEqual([]);

    await act(() => jest.advanceTimersByTimeAsync(1));

    await waitFor(() => expect(searched).toEqual(["山田"]));
  } finally {
    jest.useRealTimers();
  }
});

test("結果を名前・メールアドレス・予約件数の表で出す", async () => {
  renderWithClient(<UserSearch />);

  await userEvent.type(input(), "山田");

  const rows = await screen.findAllByRole("row");
  expect(rows[1]).toHaveTextContent("山田太郎");
  expect(rows[1]).toHaveTextContent("user1@example.com");
  expect(rows[1]).toHaveTextContent("1件");
  expect(screen.queryByText(/上位/)).toBeNull();
});

test("上限ちょうどなら、条件を絞るよう案内する", async () => {
  respondUsers(() =>
    Array.from({ length: 20 }, (_, i) => userOf(i + 1, `会員${i + 1}`)),
  );
  renderWithClient(<UserSearch />);

  await userEvent.type(input(), "会員");

  expect(
    await screen.findByText("上位20件を表示しています。条件を絞ってください。"),
  ).toBeInTheDocument();
});

test("0件なら、該当なしと出す", async () => {
  respondUsers(() => []);
  renderWithClient(<UserSearch />);

  await userEvent.type(input(), "存在しない");

  expect(
    await screen.findByText("該当する会員はいません。"),
  ).toBeInTheDocument();
});

test("失敗したら、エラーと再試行を出す", async () => {
  respondUsers(() => new HttpResponse(null, { status: 500 }));
  renderWithClient(<UserSearch />);

  await userEvent.type(input(), "山田");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "検索できませんでした。",
  );

  respondUsers((search) => [userOf(1, `${search}太郎`)]);
  await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));

  expect(await screen.findByText("山田太郎")).toBeInTheDocument();
});

test("次の検索中は、前の結果を薄く出したまま", async () => {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  respondUsers(async (search) => {
    if (search === "佐藤") {
      await released;
    }
    return HttpResponse.json({
      data: [userOf(1, `${search}太郎`)],
      meta: { limit: 20 },
    });
  });
  renderWithClient(<UserSearch />);
  await userEvent.type(input(), "山田");
  await screen.findByText("山田太郎");

  await userEvent.clear(input());
  await userEvent.type(input(), "佐藤");

  await waitFor(() =>
    expect(screen.getByTestId("user-search-results")).toHaveAttribute(
      "data-dimmed",
      "true",
    ),
  );
  expect(screen.getByText("山田太郎")).toBeInTheDocument();

  release();

  expect(await screen.findByText("佐藤太郎")).toBeInTheDocument();
});
