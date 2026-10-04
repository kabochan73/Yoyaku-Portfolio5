import { render, screen } from "@testing-library/react";
import { Alert } from "@/components/ui/Alert";

test("エラーはすぐ読み上げられる alert", () => {
  render(<Alert tone="error">予約できませんでした</Alert>);

  expect(screen.getByRole("alert")).toHaveTextContent("予約できませんでした");
});

test.each(["info", "success"] as const)("%s は status", (tone) => {
  render(<Alert tone={tone}>予約しました</Alert>);

  expect(screen.getByRole("status")).toHaveTextContent("予約しました");
});
