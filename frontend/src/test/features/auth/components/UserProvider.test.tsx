import { act, screen, waitFor } from "@testing-library/react";
import { UserProvider } from "@/features/auth/components/UserProvider";
import { useCurrentUser } from "@/features/auth/logic/hooks";
import type { User } from "@/features/auth/logic/types";
import { queryKeys } from "@/lib/query-keys";
import { renderWithClient } from "@/test/render";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

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

function renderProvider() {
  return renderWithClient(
    <UserProvider initialUser={taro}>
      <CurrentUserName />
    </UserProvider>,
  );
}

beforeEach(() => {
  replace.mockClear();
});

test("サーバーで取ったユーザーを、最初の描画から使える（/api/user は呼ばない）", () => {
  renderProvider();

  expect(screen.getByText("山田太郎")).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test("セッションが切れてユーザーが null になると、ログイン画面へ移動する", async () => {
  const { queryClient } = renderProvider();

  act(() => {
    queryClient.setQueryData(queryKeys.user, null);
  });

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
});
