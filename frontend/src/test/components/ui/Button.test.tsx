import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

test("押すと onClick が呼ばれる", async () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>予約する</Button>);

  await userEvent.click(screen.getByRole("button", { name: "予約する" }));

  expect(onClick).toHaveBeenCalledTimes(1);
});

test("無効なら押せない", async () => {
  const onClick = jest.fn();
  render(
    <Button onClick={onClick} disabled>
      予約する
    </Button>,
  );

  await userEvent.click(screen.getByRole("button", { name: "予約する" }));

  expect(onClick).not.toHaveBeenCalled();
});

test("type を指定しなければ button（フォームの中でうっかり送信しない）", () => {
  render(<Button>戻る</Button>);

  expect(screen.getByRole("button", { name: "戻る" })).toHaveAttribute(
    "type",
    "button",
  );
});

test("type に submit を指定できる", () => {
  render(<Button type="submit">ログイン</Button>);

  expect(screen.getByRole("button", { name: "ログイン" })).toHaveAttribute(
    "type",
    "submit",
  );
});
