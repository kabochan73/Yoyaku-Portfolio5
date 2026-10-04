import { http, HttpResponse } from "msw";
import { getCalendar } from "@/features/calendar/logic/server";
import { server } from "@/test/msw/server";

jest.mock("next/headers", () => ({
  cookies: async () => ({ toString: (): string => "" }),
  headers: async () => new Headers(),
}));

jest.mock("next/server", () => ({
  connection: async () => {},
}));

const calendar = {
  meta: { today: "2026-10-09", bookable_until: "2026-11-08" },
  data: [],
};

// 東京は 2026-10-09（金）の 0:30
beforeEach(() => {
  jest.useFakeTimers({
    now: new Date("2026-10-08T15:30:00Z"),
    advanceTimers: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

test("東京の今日を含む週（月〜日）を取る", async () => {
  let requested: URL | undefined;
  server.use(
    http.get("http://api.test/api/calendar", ({ request }) => {
      requested = new URL(request.url);
      return HttpResponse.json(calendar);
    }),
  );

  const result = await getCalendar();

  expect(requested?.searchParams.get("from")).toBe("2026-10-05");
  expect(requested?.searchParams.get("to")).toBe("2026-10-11");
  expect(result).toEqual({
    weekStart: "2026-10-05",
    calendar,
    fetchedAt: Date.parse("2026-10-08T15:30:00Z"),
  });
});

test("API がエラーなら null", async () => {
  server.use(
    http.get(
      "http://api.test/api/calendar",
      () => new HttpResponse(null, { status: 500 }),
    ),
  );

  expect(await getCalendar()).toBeNull();
});

test("つながらなければ null", async () => {
  server.use(
    http.get("http://api.test/api/calendar", () => HttpResponse.error()),
  );

  expect(await getCalendar()).toBeNull();
});
