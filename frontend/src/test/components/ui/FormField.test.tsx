import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/ui/FormField";

test("ラベルと入力欄が結びついている", () => {
  render(<FormField label="メールアドレス" name="email" type="email" />);

  expect(screen.getByLabelText("メールアドレス")).toHaveAttribute(
    "type",
    "email",
  );
});

test("エラーがあれば、入力欄がエラーありになり、エラー文が読まれる", () => {
  render(
    <FormField
      label="メールアドレス"
      name="email"
      error="このメールアドレスはすでに使われています。"
    />,
  );

  const input = screen.getByLabelText("メールアドレス");
  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription(
    "このメールアドレスはすでに使われています。",
  );
});

test("エラーが無ければ、エラーなしでエラー文も無い", () => {
  render(<FormField label="名前" name="name" />);

  const input = screen.getByLabelText("名前");
  expect(input).toBeValid();
  expect(input).not.toHaveAttribute("aria-describedby");
});

test("autoComplete などの属性を入力欄に渡す", () => {
  render(
    <FormField
      label="パスワード"
      name="password"
      type="password"
      autoComplete="current-password"
    />,
  );

  expect(screen.getByLabelText("パスワード")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
});
