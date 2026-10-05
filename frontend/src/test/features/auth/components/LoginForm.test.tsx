import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { User } from "@/features/auth/logic/types";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const member: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};

let loginRequests = 0;

function respondLogin(response: () => Response | Promise<Response>) {
  server.use(
    http.post("/api/login", () => {
      loginRequests += 1;
      return response();
    }),
  );
}

async function submit(email = "taro@example.com", password = "password") {
  if (email !== "") {
    await userEvent.type(screen.getByLabelText("メールアドレス"), email);
  }
  if (password !== "") {
    await userEvent.type(screen.getByLabelText("パスワード"), password);
  }
  await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
}

beforeEach(() => {
  replace.mockClear();
  loginRequests = 0;
  server.use(
    http.get(
      "/sanctum/csrf-cookie",
      () => new HttpResponse(null, { status: 204 }),
    ),
  );
});

test("入力欄は label と結びつき、autocomplete が付いている", () => {
  renderWithClient(<LoginForm />);

  expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
    "autocomplete",
    "email",
  );
  expect(screen.getByLabelText("パスワード")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
});

test("空欄で送ると、欄の下にエラーが出て、API は呼ばない", async () => {
  respondLogin(() => HttpResponse.json({ data: member }));
  renderWithClient(<LoginForm />);

  await submit("", "");

  expect(
    await screen.findByText("メールアドレスを入力してください。"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("パスワードを入力してください。"),
  ).toBeInTheDocument();
  expect(loginRequests).toBe(0);
});

test("送信中はボタンを押せず、「ログイン中...」になる", async () => {
  let release = () => {};
  respondLogin(async () => {
    await new Promise<void>((resolve) => (release = resolve));
    return HttpResponse.json({ data: member });
  });
  renderWithClient(<LoginForm />);

  await submit();

  expect(
    await screen.findByRole("button", { name: "ログイン中..." }),
  ).toBeDisabled();
  release();
  await waitFor(() => expect(replace).toHaveBeenCalled());
});

test.each([
  [
    "422（メールアドレスかパスワードが違う）",
    422,
    {
      message: "メールアドレスまたはパスワードが正しくありません。",
      code: "validation_failed",
      errors: {
        credentials: ["メールアドレスまたはパスワードが正しくありません。"],
      },
    },
    "メールアドレスまたはパスワードが正しくありません。",
  ],
  [
    "429（試行回数が多すぎる）",
    429,
    {
      message: "試行回数が多すぎます。しばらくしてからお試しください。",
      code: "too_many_requests",
    },
    "試行回数が多すぎます。しばらくしてからお試しください。",
  ],
])("%s は、フォームの上に出す", async (_, status, body, message) => {
  respondLogin(() => HttpResponse.json(body, { status }));
  renderWithClient(<LoginForm />);

  await submit();

  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByLabelText("メールアドレス")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(replace).not.toHaveBeenCalled();
});

test.each([
  ["会員は トップ へ", member, "/"],
  ["管理者は 管理画面 へ", { ...member, role: "admin" }, "/admin"],
])("ログインできたら、%s移動する", async (_, user, path) => {
  respondLogin(() => HttpResponse.json({ data: user }));
  renderWithClient(<LoginForm />);

  await submit();

  await waitFor(() => expect(replace).toHaveBeenCalledWith(path));
});
