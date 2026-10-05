import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BookingCalendar } from "@/features/calendar/components/BookingCalendar";
import type { InitialCalendar } from "@/features/calendar/logic/server";
import type { Calendar, SlotStatus } from "@/features/calendar/logic/types";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import type { Facility } from "@/features/facility/logic/types";
import { addDays } from "@/lib/date";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;
const THIS_WEEK = "2026-10-05";
const NEXT_WEEK = "2026-10-12";
const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i);

// 月曜は定休日、火曜の 10〜11時は予約済み、それ以外は空き
function calendarOf(weekStart: string, bookableUntil = "2026-11-08"): Calendar {
  return {
    meta: { today: "2026-10-05", bookable_until: bookableUntil },
    data: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      if (i === 0) {
        return { date, closed_reason: "regular_holiday", slots: [] };
      }
      return {
        date,
        closed_reason: null,
        slots: HOURS.map((hour) => ({
          hour,
          status: (i === 1 && hour <= 11
            ? "booked"
            : "available") as SlotStatus,
        })),
      };
    }),
  };
}

let requestedWeeks: string[] = [];

function respondCalendar(
  respond: (from: string) => Response | Promise<Response> = (from) =>
    HttpResponse.json(calendarOf(from)),
) {
  server.use(
    http.get("/api/calendar", ({ request }) => {
      const from = new URL(request.url).searchParams.get("from") ?? "";
      requestedWeeks.push(from);
      return respond(from);
    }),
  );
}

function initialOf(
  calendar: Calendar = calendarOf(THIS_WEEK),
): InitialCalendar {
  return { weekStart: THIS_WEEK, calendar, fetchedAt: Date.now() };
}

function renderCalendar(initialCalendar: InitialCalendar | null) {
  return renderWithClient(
    <FacilityProvider facility={facility}>
      <BookingCalendar initialCalendar={initialCalendar} />
    </FacilityProvider>,
  );
}

function slot(name: string) {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  requestedWeeks = [];
  respondCalendar();
});

describe("最初の表示", () => {
  test("サーバーで取った今週をそのまま出し、今週の /calendar は呼ばない", async () => {
    renderCalendar(initialOf());

    expect(slot("10月7日（水） 10:00 〜 11:00 空き")).toBeEnabled();
    await waitFor(() => expect(requestedWeeks).toEqual([NEXT_WEEK]));
  });

  describe("サーバーで取れなかったとき", () => {
    beforeEach(() => {
      // 東京は 2026-10-09（金）
      jest.useFakeTimers({
        now: new Date("2026-10-09T03:00:00Z"),
        advanceTimers: true,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("ブラウザで今週を取る", async () => {
      renderCalendar(null);

      expect(screen.getByTestId("calendar-skeleton")).toBeInTheDocument();
      expect(
        await screen.findByRole("button", {
          name: "10月7日（水） 10:00 〜 11:00 空き",
        }),
      ).toBeEnabled();
      expect(requestedWeeks[0]).toBe(THIS_WEEK);
    });

    test("それも失敗したら、エラーと再読み込みを出し、「－」の枠は出さない", async () => {
      respondCalendar(() => new HttpResponse(null, { status: 500 }));
      renderCalendar(null);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "空き状況を取得できませんでした。",
      );
      expect(
        screen.getByRole("button", { name: "再読み込み" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      respondCalendar();
      await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));

      expect(
        await screen.findByRole("button", {
          name: "10月7日（水） 10:00 〜 11:00 空き",
        }),
      ).toBeInTheDocument();
    });
  });
});

describe("枠の表示", () => {
  test("予約済みと受付外の枠は押せない", () => {
    renderCalendar(initialOf());

    expect(slot("10月6日（火） 10:00 〜 11:00 予約済み")).toBeDisabled();
    expect(slot("10月5日（月） 10:00 〜 11:00 受付外")).toBeDisabled();
  });

  test("見出しに日付と、受付外の日の理由を出す", () => {
    renderCalendar(initialOf());

    const headings = screen.getAllByRole("columnheader");
    expect(headings[1]).toHaveTextContent("10/5（月）定休日");
    expect(headings[2]).toHaveTextContent("10/6（火）");
  });

  test("営業時間の分だけ行がある（10時〜21時の12行）", () => {
    renderCalendar(initialOf());

    const rows = screen.getAllByRole("rowheader");
    expect(rows).toHaveLength(12);
    expect(rows[0]).toHaveTextContent("10:00〜11:00");
    expect(rows[11]).toHaveTextContent("21:00〜22:00");
  });
});

describe("週送り", () => {
  test("今週より前には戻れない", () => {
    renderCalendar(initialOf());

    expect(screen.getByRole("button", { name: "← 前の週" })).toBeDisabled();
  });

  test("次の週へ進むと、その週を出し、前の週へ戻れる", async () => {
    renderCalendar(initialOf());

    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));

    expect(screen.getByText("10/12 〜 10/18")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "10月13日（火） 10:00 〜 11:00 予約済み",
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "← 前の週" })).toBeEnabled();
  });

  test("予約できる最終日を含む週より先には進めない", async () => {
    respondCalendar((from) =>
      HttpResponse.json(calendarOf(from, "2026-10-12")),
    );
    renderCalendar(initialOf(calendarOf(THIS_WEEK, "2026-10-12")));

    const next = screen.getByRole("button", { name: "次の週 →" });
    expect(next).toBeEnabled();

    await userEvent.click(next);
    await screen.findByRole("button", {
      name: "10月13日（火） 10:00 〜 11:00 予約済み",
    });

    expect(screen.getByRole("button", { name: "次の週 →" })).toBeDisabled();
  });

  test("切り替え中は、見出しを新しい週にし、前の週の枠を薄くして押せなくする", async () => {
    let release = () => {};
    respondCalendar(async (from) => {
      if (from === "2026-10-19") {
        await new Promise<void>((resolve) => (release = resolve));
      }
      return HttpResponse.json(calendarOf(from));
    });
    renderCalendar(initialOf());
    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));
    await screen.findByRole("button", {
      name: "10月13日（火） 10:00 〜 11:00 予約済み",
    });

    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("data-dimmed", "true");
    expect(within(table).getAllByRole("columnheader")[1]).toHaveTextContent(
      "10/19（月）",
    );
    expect(
      within(table)
        .getAllByRole("button")
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);

    release();
    await waitFor(() =>
      expect(screen.getByRole("table")).toHaveAttribute("data-dimmed", "false"),
    );
  });
});

describe("枠の選択", () => {
  const WED = "10月7日（水）";

  function hint() {
    return screen.getByTestId("selection-hint");
  }

  async function press(hour: number, spoken = "空き") {
    await userEvent.click(
      slot(`${WED} ${hour}:00 〜 ${hour + 1}:00 ${spoken}`),
    );
  }

  test("最初は、開始の枠を選ぶよう案内する", () => {
    renderCalendar(initialOf());

    expect(hint()).toHaveTextContent(
      "開始時刻の枠を選んでください（2〜4時間）",
    );
  });

  test("開始を選ぶと、2〜4枠目が終了候補になり、案内が変わる", async () => {
    renderCalendar(initialOf());

    await press(12);

    expect(slot(`${WED} 12:00 〜 13:00 空き（開始）`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(slot(`${WED} 13:00 〜 14:00 空き（終了候補）`)).toBeEnabled();
    expect(slot(`${WED} 15:00 〜 16:00 空き（終了候補）`)).toBeEnabled();
    expect(slot(`${WED} 16:00 〜 17:00 空き`)).toBeEnabled();
    expect(hint()).toHaveTextContent(
      "終了時刻の枠を選んでください。12:00から2〜4時間まで選べます",
    );
  });

  test("終了候補を押すと、開始からその枠までが選ばれる", async () => {
    renderCalendar(initialOf());

    await press(12);
    await press(14, "空き（終了候補）");

    expect(
      screen.getAllByRole("button", { name: /空き（選択中）$/ }),
    ).toHaveLength(3);
    expect(hint()).toHaveTextContent(
      "10月7日（水） 12:00 〜 15:00（3時間）を選びました",
    );
  });

  test("開始をもう一度押すと、選択を解除する", async () => {
    renderCalendar(initialOf());

    await press(12);
    await press(12, "空き（開始）");

    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(hint()).toHaveTextContent("開始時刻の枠を選んでください");
  });

  test("週を変えると、選択を解除する", async () => {
    renderCalendar(initialOf());
    await press(12);

    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));
    await userEvent.click(screen.getByRole("button", { name: "← 前の週" }));

    expect(hint()).toHaveTextContent("開始時刻の枠を選んでください");
    expect(slot(`${WED} 12:00 〜 13:00 空き`)).not.toHaveAttribute(
      "aria-pressed",
    );
  });

  test("閉店間際で続けて空いていなければ、別の枠を選ぶよう案内する", async () => {
    renderCalendar(initialOf());

    await press(21);

    expect(hint()).toHaveTextContent(
      "この時間からは2時間以上続けて空いていません。別の枠を選んでください",
    );
  });

  test("取り直しで開始の枠が予約済みに変わると、終了候補が消え、案内が変わる", async () => {
    const { queryClient } = renderCalendar(initialOf());
    await press(12);

    const updated = calendarOf(THIS_WEEK);
    const wednesday = updated.data[2];
    if (wednesday) {
      wednesday.slots = wednesday.slots.map((s) =>
        s.hour === 12 ? { ...s, status: "booked" } : s,
      );
    }
    act(() => {
      queryClient.setQueryData(queryKeys.calendar.week(THIS_WEEK), updated);
    });

    expect(
      await screen.findByRole("button", {
        name: `${WED} 12:00 〜 13:00 予約済み`,
      }),
    ).toBeDisabled();
    expect(screen.queryAllByRole("button", { name: /終了候補/ })).toHaveLength(
      0,
    );
    expect(hint()).toHaveTextContent(
      "この時間からは2時間以上続けて空いていません",
    );
  });
});
