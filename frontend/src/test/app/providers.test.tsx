import { createQueryClient } from "@/app/providers";
import { ApiError } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

function apiError(status: number): ApiError {
  return new ApiError(status, "エラー", null, {}, null);
}

describe("401 を受けたら、ログイン中のユーザーを空にする", () => {
  test("取得で受けたとき", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.user, { id: 1 });

    await queryClient
      .fetchQuery({
        queryKey: queryKeys.myReservations,
        queryFn: () => Promise.reject(apiError(401)),
      })
      .catch(() => undefined);

    expect(queryClient.getQueryData(queryKeys.user)).toBeNull();
  });

  test("送信で受けたとき", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.user, { id: 1 });

    await queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(apiError(401)) })
      .execute(undefined)
      .catch(() => undefined);

    expect(queryClient.getQueryData(queryKeys.user)).toBeNull();
  });

  test("401 以外では空にしない", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.user, { id: 1 });

    await queryClient
      .fetchQuery({
        queryKey: queryKeys.myReservations,
        queryFn: () => Promise.reject(apiError(403)),
      })
      .catch(() => undefined);

    expect(queryClient.getQueryData(queryKeys.user)).toEqual({ id: 1 });
  });
});

describe("再試行", () => {
  test("4xx は再試行しない", async () => {
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
    });
    const queryFn = jest.fn(() => Promise.reject(apiError(422)));

    await queryClient
      .fetchQuery({ queryKey: ["test"], queryFn })
      .catch(() => undefined);

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  test("500 などは1回だけ再試行する", async () => {
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
    });
    const queryFn = jest.fn(() => Promise.reject(apiError(500)));

    await queryClient
      .fetchQuery({ queryKey: ["test"], queryFn })
      .catch(() => undefined);

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
