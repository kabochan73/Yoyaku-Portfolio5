import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import type { User } from "@/features/auth/logic/types";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { createTestQueryClient, renderWithClient } from "@/test/render";

const taro: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};

let sent: Record<string, unknown> | undefined;

function renderForm() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.user, taro);
  renderWithClient(<ProfileForm />, { queryClient });
  return queryClient;
}

function field(label: string) {
  return screen.getByLabelText(label);
}

async function replace(label: string, value: string) {
  await userEvent.clear(field(label));
  if (value !== "") {
    await userEvent.type(field(label), value);
  }
}

async function submit() {
  await userEvent.click(screen.getByRole("button", { name: "更新する" }));
}

beforeEach(() => {
  sent = undefined;
  server.use(
    http.put("/api/user/profile", async ({ request }) => {
      sent = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ data: { ...taro, name: sent.name } });
    }),
  );
});

test("名前とメールアドレスは今の値が入り、パスワード欄は空", () => {
  renderForm();

  expect(field("名前")).toHaveValue("山田太郎");
  expect(field("メールアドレス")).toHaveValue("taro@example.com");
  expect(field("現在のパスワード")).toHaveValue("");
  expect(field("新しいパスワード（8文字以上）")).toHaveValue("");
  expect(field("現在のパスワード")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
});

test("パスワードを入れなければ、名前とメールアドレスだけを送る", async () => {
  renderForm();

  await replace("名前", "山田花子");
  await submit();

  await waitFor(() =>
    expect(sent).toEqual({ name: "山田花子", email: "taro@example.com" }),
  );
});

test("新しいパスワードを入れたのに現在のパスワードが空なら、送らない", async () => {
  renderForm();

  await replace("新しいパスワード（8文字以上）", "newpassword");
  await replace("新しいパスワード（確認）", "newpassword");
  await submit();

  expect(
    await screen.findByText("現在のパスワードを入力してください。"),
  ).toBeInTheDocument();
  expect(sent).toBeUndefined();
});

test("現在のパスワードが違えば、その欄の下に出す", async () => {
  server.use(
    http.put("/api/user/profile", () =>
      HttpResponse.json(
        {
          message: "入力内容を確認してください。",
          code: "validation_failed",
          errors: {
            current_password: ["現在のパスワードが正しくありません。"],
          },
        },
        { status: 422 },
      ),
    ),
  );
  renderForm();

  await replace("現在のパスワード", "wrongpass");
  await replace("新しいパスワード（8文字以上）", "newpassword");
  await replace("新しいパスワード（確認）", "newpassword");
  await submit();

  expect(
    await screen.findByText("現在のパスワードが正しくありません。"),
  ).toBeInTheDocument();
  expect(field("現在のパスワード")).toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByText("プロフィールを更新しました。")).toBeNull();
});

test("更新できたら、メッセージを出し、パスワード欄を空に戻し、ユーザーを置き換える", async () => {
  const queryClient = renderForm();

  await replace("名前", "山田花子");
  await replace("現在のパスワード", "password");
  await replace("新しいパスワード（8文字以上）", "newpassword");
  await replace("新しいパスワード（確認）", "newpassword");
  await submit();

  expect(
    await screen.findByText("プロフィールを更新しました。"),
  ).toBeInTheDocument();
  expect(sent).toMatchObject({ password: "newpassword" });
  expect(field("名前")).toHaveValue("山田花子");
  expect(field("現在のパスワード")).toHaveValue("");
  expect(field("新しいパスワード（8文字以上）")).toHaveValue("");
  expect(queryClient.getQueryData<User>(queryKeys.user)?.name).toBe("山田花子");

  await userEvent.type(field("名前"), "子");

  expect(screen.queryByText("プロフィールを更新しました。")).toBeNull();
});
