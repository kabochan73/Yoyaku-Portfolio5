import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

let sent: unknown;

async function fill({
  name = "山田太郎",
  email = "taro@example.com",
  password = "password123",
  confirmation = "password123",
} = {}) {
  await userEvent.type(screen.getByLabelText("名前"), name);
  await userEvent.type(screen.getByLabelText("メールアドレス"), email);
  await userEvent.type(
    screen.getByLabelText("パスワード（8文字以上）"),
    password,
  );
  await userEvent.type(
    screen.getByLabelText("パスワード（確認）"),
    confirmation,
  );
  await userEvent.click(screen.getByRole("button", { name: "登録する" }));
}

beforeEach(() => {
  replace.mockClear();
  sent = undefined;
  server.use(
    http.get(
      "/sanctum/csrf-cookie",
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post("/api/register", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json(
        {
          data: {
            id: 1,
            name: "山田太郎",
            email: "taro@example.com",
            role: "user",
          },
        },
        { status: 201 },
      );
    }),
  );
});

test("autocomplete が付いている", () => {
  renderWithClient(<RegisterForm />);

  expect(screen.getByLabelText("名前")).toHaveAttribute("autocomplete", "name");
  expect(screen.getByLabelText("パスワード（確認）")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
});

test("確認用パスワードが違えば、その欄の下にエラーが出て、API は呼ばない", async () => {
  renderWithClient(<RegisterForm />);

  await fill({ confirmation: "different1" });

  expect(
    await screen.findByText("パスワードが確認用と一致しません。"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("パスワード（確認）")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(sent).toBeUndefined();
});

test("422 のメールアドレス重複は、メールアドレス欄の下に出す", async () => {
  server.use(
    http.post("/api/register", () =>
      HttpResponse.json(
        {
          message: "入力内容を確認してください。",
          code: "validation_failed",
          errors: {
            email: ["このメールアドレスはすでに登録されています。"],
          },
        },
        { status: 422 },
      ),
    ),
  );
  renderWithClient(<RegisterForm />);

  await fill();

  expect(
    await screen.findByText("このメールアドレスはすでに登録されています。"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("登録できたら、入力内容を送ってトップへ移動する", async () => {
  renderWithClient(<RegisterForm />);

  await fill();

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  expect(sent).toEqual({
    name: "山田太郎",
    email: "taro@example.com",
    password: "password123",
    password_confirmation: "password123",
  });
});
