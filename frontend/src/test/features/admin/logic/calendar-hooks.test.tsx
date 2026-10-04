import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import {
  useAdminCalendar,
  useCancelReservationAsAdmin,
  useCreatePhoneReservation,
} from "@/features/admin/logic/hooks";
import type { AdminReservation } from "@/features/admin/logic/types";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";

const WEEK = "2026-10-05";
const ADMIN_KEY = queryKeys.admin.calendar.week(WEEK);
const MEMBER_KEY = queryKeys.calendar.week(WEEK);

const phoneReservation: AdminReservation = {
  id: 7,
  date: "2026-10-09",
  start_hour: 18,
  end_hour: 20,
  hours: 2,
  price: 12000,
  status: "confirmed",
  phase: "before_start",
  is_cancellable: true,
  booker_name: "佐藤",
  user_id: null,
  is_phone: true,
};

function setup<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(ADMIN_KEY, { meta: {}, data: [] });
  queryClient.setQueryData(MEMBER_KEY, { meta: {}, data: [] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(hook, { wrapper });
  return { queryClient, result };
}

function expectCalendarsInvalidated(
  queryClient: ReturnType<typeof createTestQueryClient>,
) {
  expect(queryClient.getQueryState(ADMIN_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(MEMBER_KEY)?.isInvalidated).toBe(true);
}

test("管理者のカレンダーを取り、60秒ごとに取り直す", async () => {
  const requested: string[] = [];
  server.use(
    http.get("/api/admin/calendar", ({ request }) => {
      const url = new URL(request.url);
      requested.push(
        `${url.searchParams.get("from")}~${url.searchParams.get("to")}`,
      );
      return HttpResponse.json({ meta: {}, data: [] });
    }),
  );
  jest.useFakeTimers({ advanceTimers: true });
  try {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAdminCalendar(WEEK), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requested).toEqual(["2026-10-05~2026-10-11"]);

    await act(() => jest.advanceTimersByTimeAsync(60_000));

    await waitFor(() => expect(requested).toHaveLength(2));
  } finally {
    jest.useRealTimers();
  }
});

test("電話予約できたら、両方のカレンダーを取り直させる", async () => {
  let sent: unknown;
  server.use(
    http.post("/api/admin/reservations", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ data: phoneReservation }, { status: 201 });
    }),
  );
  const { queryClient, result } = setup(() => useCreatePhoneReservation());

  await act(() =>
    result.current.mutateAsync({
      date: "2026-10-09",
      start_hour: 18,
      end_hour: 20,
      booker_name: "佐藤",
    }),
  );

  expect(sent).toEqual({
    date: "2026-10-09",
    start_hour: 18,
    end_hour: 20,
    booker_name: "佐藤",
  });
  expectCalendarsInvalidated(queryClient);
});

test("電話予約が先に埋まって失敗しても、両方のカレンダーを取り直させる", async () => {
  server.use(
    http.post("/api/admin/reservations", () =>
      HttpResponse.json(
        { message: "その時間帯は先に予約されました。", code: "slot_taken" },
        { status: 409 },
      ),
    ),
  );
  const { queryClient, result } = setup(() => useCreatePhoneReservation());

  act(() =>
    result.current.mutate({
      date: "2026-10-09",
      start_hour: 18,
      end_hour: 20,
      booker_name: "佐藤",
    }),
  );

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toMatchObject({ code: "slot_taken" });
  expectCalendarsInvalidated(queryClient);
});

test("キャンセルできたら、両方のカレンダーを取り直させる", async () => {
  let cancelledId: string | undefined;
  server.use(
    http.post("/api/admin/reservations/:id/cancel", ({ params }) => {
      cancelledId = String(params.id);
      return HttpResponse.json({
        data: { ...phoneReservation, status: "cancelled" },
      });
    }),
  );
  const { queryClient, result } = setup(() => useCancelReservationAsAdmin());

  await act(() => result.current.mutateAsync(7));

  expect(cancelledId).toBe("7");
  expectCalendarsInvalidated(queryClient);
});
