import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { applyServerErrors } from "@/lib/form-errors";

type LoginForm = { email: string; password: string };

function setup() {
  const { result } = renderHook(() => {
    const form = useForm<LoginForm>();
    // 描画の中で読んだ値だけが更新されるので、画面と同じく errors を読んでおく
    void form.formState.errors;
    return form;
  });
  const apply = (error: unknown) =>
    act(() =>
      applyServerErrors(result.current.setError, error, ["email", "password"]),
    );
  const errors = () => result.current.formState.errors;
  return { apply, errors };
}

test("入力欄にあるエラーは、その欄に入れる", () => {
  const { apply, errors } = setup();

  apply(
    new ApiError(
      422,
      "入力内容を確認してください。",
      "validation_failed",
      { email: ["このメールアドレスはすでに使われています。"] },
      null,
    ),
  );

  expect(errors().email?.message).toBe(
    "このメールアドレスはすでに使われています。",
  );
  expect(errors().root?.server).toBeUndefined();
});

test("入力欄に無いエラーは、フォームの上に出すエラーにまとめる", () => {
  const { apply, errors } = setup();

  apply(
    new ApiError(
      422,
      "入力内容を確認してください。",
      "validation_failed",
      { credentials: ["メールアドレスまたはパスワードが正しくありません。"] },
      null,
    ),
  );

  expect(errors().root?.server?.message).toBe(
    "メールアドレスまたはパスワードが正しくありません。",
  );
});

test("項目ごとのエラーが無ければ、メッセージをフォームの上に出す", () => {
  const { apply, errors } = setup();

  apply(
    new ApiError(429, "試行回数が多すぎます。", "too_many_requests", {}, null),
  );

  expect(errors().root?.server?.message).toBe("試行回数が多すぎます。");
});

test("ApiError でなければ、通信の失敗のメッセージを出す", () => {
  const { apply, errors } = setup();

  apply(new Error("予期しないエラー"));

  expect(errors().root?.server?.message).toBe(NETWORK_ERROR_MESSAGE);
});
