import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import {
  useCancelReservation,
  useCreateReservation,
  useMyReservations,
} from "@/features/reservations/logic/hooks";
import type { Reservation } from "@/features/reservations/logic/types";
import { ApiError } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";

const reservation: Reservation = {
  id: 1,
  date: "2026-10-09",
  start_hour: 18,
  end_hour: 20,
  hours: 2,
  price: 12000,
  status: "confirmed",
  phase: "before_start",
  is_cancellable: true,
  booker_name: null,
};

const CALENDAR_KEY = queryKeys.calendar.week("2026-10-05");

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(CALENDAR_KEY, { meta: {}, data: [] });
  queryClient.setQueryData(queryKeys.myReservations, []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({
      create: useCreateReservation(),
      cancel: useCancelReservation(),
    }),
    { wrapper },
  );
  return { queryClient, result };
}

function isInvalidated(
  queryClient: ReturnType<typeof createTestQueryClient>,
  key: readonly unknown[],
) {
  return queryClient.getQueryState(key)?.isInvalidated;
}

test("自分の予約一覧を取る", async () => {
  server.use(
    http.get("/api/user/reservations", () =>
      HttpResponse.json({ data: [reservation] }),
    ),
  );
  const queryClient = createTestQueryClient();
  const { result } = renderHook(() => useMyReservations(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  await waitFor(() => expect(result.current.data).toEqual([reservation]));
});

test("予約できたら、カレンダーと予約一覧を取り直させる", async () => {
  let sent: unknown;
  server.use(
    http.post("/api/reservations", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ data: reservation }, { status: 201 });
    }),
  );
  const { queryClient, result } = setup();

  await act(() =>
    result.current.create.mutateAsync({
      date: "2026-10-09",
      start_hour: 18,
      end_hour: 20,
    }),
  );

  expect(sent).toEqual({ date: "2026-10-09", start_hour: 18, end_hour: 20 });
  expect(isInvalidated(queryClient, CALENDAR_KEY)).toBe(true);
  expect(isInvalidated(queryClient, queryKeys.myReservations)).toBe(true);
});

test("先に予約されて失敗しても、カレンダーを取り直させる", async () => {
  server.use(
    http.post("/api/reservations", () =>
      HttpResponse.json(
        { message: "その時間帯は先に予約されました。", code: "slot_taken" },
        { status: 409 },
      ),
    ),
  );
  const { queryClient, result } = setup();

  act(() =>
    result.current.create.mutate({
      date: "2026-10-09",
      start_hour: 18,
      end_hour: 20,
    }),
  );

  await waitFor(() => expect(result.current.create.isError).toBe(true));
  expect(result.current.create.error).toBeInstanceOf(ApiError);
  expect(result.current.create.error).toMatchObject({
    status: 409,
    code: "slot_taken",
    message: "その時間帯は先に予約されました。",
  });
  expect(isInvalidated(queryClient, CALENDAR_KEY)).toBe(true);
});

test("キャンセルできたら、カレンダーと予約一覧を取り直させる", async () => {
  let cancelledId: string | undefined;
  server.use(
    http.post("/api/reservations/:id/cancel", ({ params }) => {
      cancelledId = String(params.id);
      return HttpResponse.json({
        data: { ...reservation, status: "cancelled", is_cancellable: false },
      });
    }),
  );
  const { queryClient, result } = setup();

  await act(() => result.current.cancel.mutateAsync(1));

  expect(cancelledId).toBe("1");
  expect(isInvalidated(queryClient, CALENDAR_KEY)).toBe(true);
  expect(isInvalidated(queryClient, queryKeys.myReservations)).toBe(true);
});

test("キャンセルを断られても、予約一覧を取り直させる", async () => {
  server.use(
    http.post("/api/reservations/:id/cancel", () =>
      HttpResponse.json(
        {
          message:
            "この予約はキャンセルできません（開始済み、またはキャンセル済み）。",
          code: "reservation_not_cancellable",
        },
        { status: 409 },
      ),
    ),
  );
  const { queryClient, result } = setup();

  act(() => result.current.cancel.mutate(1));

  await waitFor(() => expect(result.current.cancel.isError).toBe(true));
  expect(isInvalidated(queryClient, queryKeys.myReservations)).toBe(true);
});
