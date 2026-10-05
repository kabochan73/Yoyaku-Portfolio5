import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { reservationCountOf } from "@/features/admin/logic/api";
import {
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
  useSearchUsers,
  useUpdatePrices,
  useUpdateRegularHolidays,
} from "@/features/admin/logic/hooks";
import type { Facility } from "@/features/facility/logic/types";
import { ApiError } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;
const CALENDAR_KEY = queryKeys.calendar.week("2026-10-05");

function setup<P, T>(hook: (props: P) => T, initialProps?: P) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.facility, facility);
  queryClient.setQueryData(CALENDAR_KEY, { meta: {}, data: [] });
  queryClient.setQueryData(queryKeys.admin.holidays, []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(hook, { wrapper, initialProps });
  return { queryClient, ...view };
}

describe("設定", () => {
  test("料金を変えたら、返ってきた施設情報に置き換える", async () => {
    const updated = { ...facility, prices: { weekday: 5000, weekend: 7000 } };
    server.use(
      http.put("/api/admin/prices", () => HttpResponse.json({ data: updated })),
    );
    const { queryClient, result } = setup(() => useUpdatePrices());

    await act(() => result.current.mutateAsync(updated.prices));

    expect(queryClient.getQueryData(queryKeys.facility)).toEqual(updated);
  });

  test("定休日を変えたら、施設情報を置き換えてカレンダーを取り直させる", async () => {
    let sent: unknown;
    const updated = { ...facility, regular_holidays: [1, 3] };
    server.use(
      http.put("/api/admin/regular-holidays", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: updated });
      }),
    );
    const { queryClient, result } = setup(() => useUpdateRegularHolidays());

    await act(() => result.current.mutateAsync([1, 3]));

    expect(sent).toEqual({ days: [1, 3] });
    expect(queryClient.getQueryData(queryKeys.facility)).toEqual(updated);
    expect(queryClient.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });
});

describe("休業日", () => {
  const holiday = { id: 3, date: "2026-10-20", reason: "設備点検" };

  test("一覧を取る", async () => {
    server.use(
      http.get("/api/admin/holidays", () =>
        HttpResponse.json({ data: [holiday] }),
      ),
    );
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useHolidays(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.data).toEqual([holiday]));
  });

  test("登録したら、一覧とカレンダーを取り直させる", async () => {
    server.use(
      http.post("/api/admin/holidays", () =>
        HttpResponse.json({ data: holiday }, { status: 201 }),
      ),
    );
    const { queryClient, result } = setup(() => useCreateHoliday());

    await act(() =>
      result.current.mutateAsync({
        date: holiday.date,
        reason: holiday.reason,
      }),
    );

    expect(
      queryClient.getQueryState(queryKeys.admin.holidays)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });

  test("予約がある日なら、断られた件数を取り出せる", async () => {
    server.use(
      http.post("/api/admin/holidays", () =>
        HttpResponse.json(
          {
            message:
              "この日には2件の予約があります。すべてキャンセルして休業日にしますか？",
            code: "holiday_has_reservations",
            reservation_count: 2,
          },
          { status: 409 },
        ),
      ),
    );
    const { result } = setup(() => useCreateHoliday());

    act(() => result.current.mutate({ date: holiday.date, reason: null }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(reservationCountOf(result.current.error)).toBe(2);
  });

  test("別の理由で断られたときは、件数なし", () => {
    expect(
      reservationCountOf(
        new ApiError(409, "", "holiday_already_exists", {}, {}),
      ),
    ).toBeNull();
    expect(reservationCountOf(new Error("x"))).toBeNull();
  });

  test("削除したら、一覧とカレンダーを取り直させる", async () => {
    let deletedId: string | undefined;
    server.use(
      http.delete("/api/admin/holidays/:id", ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { queryClient, result } = setup(() => useDeleteHoliday());

    await act(() => result.current.mutateAsync(3));

    expect(deletedId).toBe("3");
    expect(
      queryClient.getQueryState(queryKeys.admin.holidays)?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(CALENDAR_KEY)?.isInvalidated).toBe(true);
  });
});

describe("利用者の検索", () => {
  let searched: string[] = [];

  beforeEach(() => {
    searched = [];
    server.use(
      http.get("/api/admin/users", ({ request }) => {
        const search = new URL(request.url).searchParams.get("search") ?? "";
        searched.push(search);
        return HttpResponse.json({
          data: [
            {
              id: 1,
              name: `${search}さん`,
              email: "a@example.com",
              confirmed_reservations_count: 0,
            },
          ],
          meta: { limit: 20 },
        });
      }),
    );
  });

  test("検索語が空白だけなら取らない", async () => {
    const { result } = setup(() => useSearchUsers("  "));

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(searched).toEqual([]);
    expect(result.current.data).toBeUndefined();
  });

  test("前後の空白を除いて検索し、次の検索中は前の結果を表示したまま", async () => {
    const { result, rerender } = setup(
      ({ search }: { search: string }) => useSearchUsers(search),
      { search: " 山田 " },
    );
    await waitFor(() =>
      expect(result.current.data?.users[0]?.name).toBe("山田さん"),
    );

    rerender({ search: "佐藤" });

    expect(result.current.data?.users[0]?.name).toBe("山田さん");
    await waitFor(() =>
      expect(result.current.data?.users[0]?.name).toBe("佐藤さん"),
    );
    expect(searched).toEqual(["山田", "佐藤"]);
  });
});
