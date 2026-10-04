import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/ui/ErrorState";

test("エラー文を出し、再読み込みを押すと onRetry を呼ぶ", async () => {
  const onRetry = jest.fn();
  render(
    <ErrorState message="空き状況を取得できませんでした" onRetry={onRetry} />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "空き状況を取得できませんでした",
  );

  await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));

  expect(onRetry).toHaveBeenCalledTimes(1);
});
