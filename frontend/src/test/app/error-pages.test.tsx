import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";

test("エラーページは、再読み込みとトップへのリンクを出す", async () => {
  const retry = jest.fn();
  render(<ErrorPage retry={retry} />);

  expect(
    screen.getByRole("heading", { name: "ページを表示できませんでした" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "トップページへ戻る" }),
  ).toHaveAttribute("href", "/");

  await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));

  expect(retry).toHaveBeenCalledTimes(1);
});

test("見つからないページは、トップへのリンクを出す", () => {
  render(<NotFound />);

  expect(
    screen.getByRole("heading", {
      name: "お探しのページは見つかりませんでした",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "トップページへ戻る" }),
  ).toHaveAttribute("href", "/");
});
