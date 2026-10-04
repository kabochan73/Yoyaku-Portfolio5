import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { useCalendar } from "@/features/calendar/logic/hooks";
import type { InitialCalendar } from "@/features/calendar/logic/server";
import type { Calendar } from "@/features/calendar/logic/types";
import { addDays } from "@/lib/date";
import { server } from "@/test/msw/server";
import { createTestQueryClient } from "@/test/render";

const THIS_WEEK = "2026-10-05";
const NEXT_WEEK = "2026-10-12";

function calendarOf(weekStart: string, bookableUntil = "2026-11-08"): Calendar {
  return {
    meta: { today: "2026-10-09", bookable_until: bookableUntil },
    data: [{ date: weekStart, closed_reason: null, slots: [] }],
  };
}

let requestedWeeks: string[] = [];

beforeEach(() => {
  requestedWeeks = [];
  server.use(
    http.get("/api/calendar", ({ request }) => {
      const from = new URL(request.url).searchParams.get("from") ?? "";
      requestedWeeks.push(from);
      return HttpResponse.json(calendarOf(from));
    }),
  );
});

function setup(weekStart: string, initial: InitialCalendar | null = null) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    ({ weekStart }: { weekStart: string }) => useCalendar(weekStart, initial),
    { wrapper, initialProps: { weekStart } },
  );
  return { queryClient, ...view };
}

function initialOf(weekStart: string): InitialCalendar {
  return { weekStart, calendar: calendarOf(weekStart), fetchedAt: Date.now() };
}

test("サーバーで取った週なら、それをそのまま表示して取り直さない", async () => {
  const { result } = setup(THIS_WEEK, initialOf(THIS_WEEK));

  expect(result.current.data?.data[0]?.date).toBe(THIS_WEEK);
  await waitFor(() => expect(requestedWeeks).toEqual([NEXT_WEEK]));
});

test("サーバーで取った週と違えば、ブラウザで取る", async () => {
  const { result } = setup(NEXT_WEEK, initialOf(THIS_WEEK));

  await waitFor(() =>
    expect(result.current.data?.data[0]?.date).toBe(NEXT_WEEK),
  );
  expect(requestedWeeks[0]).toBe(NEXT_WEEK);
});

test("60秒ごとに取り直す", async () => {
  jest.useFakeTimers({ advanceTimers: true });
  try {
    setup(THIS_WEEK, initialOf(THIS_WEEK));
    await waitFor(() => expect(requestedWeeks).toEqual([NEXT_WEEK]));

    await act(() => jest.advanceTimersByTimeAsync(60_000));

    await waitFor(() => expect(requestedWeeks).toContain(THIS_WEEK));
  } finally {
    jest.useRealTimers();
  }
});

test("週を切り替えている間は、前の週を表示したまま", async () => {
  let release = () => {};
  server.use(
    http.get("/api/calendar", async ({ request }) => {
      const from = new URL(request.url).searchParams.get("from") ?? "";
      if (from === "2026-10-19") {
        await new Promise<void>((resolve) => (release = resolve));
      }
      return HttpResponse.json(calendarOf(from));
    }),
  );
  const { result, rerender } = setup(NEXT_WEEK);
  await waitFor(() =>
    expect(result.current.data?.data[0]?.date).toBe(NEXT_WEEK),
  );

  rerender({ weekStart: addDays(NEXT_WEEK, 7) });

  expect(result.current.data?.data[0]?.date).toBe(NEXT_WEEK);
  expect(result.current.isPlaceholderData).toBe(true);

  act(() => release());
  await waitFor(() =>
    expect(result.current.data?.data[0]?.date).toBe("2026-10-19"),
  );
});

test("次の週が予約できる範囲を超えるなら、先読みしない", async () => {
  const initial = {
    weekStart: THIS_WEEK,
    calendar: calendarOf(THIS_WEEK, "2026-10-11"),
    fetchedAt: Date.now(),
  };
  const { queryClient } = setup(THIS_WEEK, initial);

  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  expect(requestedWeeks).toEqual([]);
  expect(queryClient.isFetching()).toBe(0);
});
