import { screen } from "@testing-library/react";
import { UserProvider } from "@/features/auth/components/UserProvider";
import { useCurrentUser } from "@/features/auth/logic/hooks";
import type { User } from "@/features/auth/logic/types";
import { renderWithClient } from "@/test/render";

const taro: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};

function CurrentUserName() {
  const { data } = useCurrentUser();
  return (
    <p>{data === undefined ? "読み込み中" : (data?.name ?? "未ログイン")}</p>
  );
}

test("サーバーで取ったユーザーを、最初の描画から使える（/api/user は呼ばない）", () => {
  renderWithClient(
    <UserProvider initialUser={taro}>
      <CurrentUserName />
    </UserProvider>,
  );

  expect(screen.getByText("山田太郎")).toBeInTheDocument();
});
