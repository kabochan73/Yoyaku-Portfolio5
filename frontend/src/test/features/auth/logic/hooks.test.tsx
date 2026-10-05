import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import {
  useCurrentUser,
  useLogin,
  useLogout,
} from "@/features/auth/logic/hooks";
import { reloadTo } from "@/lib/navigation";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";

jest.mock("@/lib/navigation", () => ({ reloadTo: jest.fn() }));

const taro = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({
      currentUser: useCurrentUser(),
      login: useLogin(),
      logout: useLogout(),
    }),
    { wrapper },
  );
  return { queryClient, result };
}

let userRequests = 0;

beforeEach(() => {
  userRequests = 0;
  server.use(
    http.get("/api/user", () => {
      userRequests += 1;
      return HttpResponse.json(
        { message: "ログインしてください。", code: "unauthenticated" },
        { status: 401 },
      );
    }),
    http.get(
      "/sanctum/csrf-cookie",
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post("/api/login", () => HttpResponse.json({ data: taro })),
    http.post("/api/logout", () => new HttpResponse(null, { status: 204 })),
  );
});

test("未ログインなら、エラーではなく null", async () => {
  const { result } = setup();

  await waitFor(() => expect(result.current.currentUser.isSuccess).toBe(true));

  expect(result.current.currentUser.data).toBeNull();
});

test("ログインすると、/api/user を取り直さずに、返ってきたユーザーに置き換える", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.currentUser.isSuccess).toBe(true));

  await act(() =>
    result.current.login.mutateAsync({
      email: "taro@example.com",
      password: "password",
    }),
  );

  await waitFor(() => expect(result.current.currentUser.data).toEqual(taro));
  expect(userRequests).toBe(1);
});

test("ログアウトできたら、ユーザーを null にせず、トップを読み直す", async () => {
  const { queryClient, result } = setup();
  await waitFor(() => expect(result.current.currentUser.isSuccess).toBe(true));
  queryClient.setQueryData(queryKeys.user, taro);

  await act(() => result.current.logout.mutateAsync());

  expect(reloadTo).toHaveBeenCalledWith("/");
  expect(queryClient.getQueryData(queryKeys.user)).toEqual(taro);
});
