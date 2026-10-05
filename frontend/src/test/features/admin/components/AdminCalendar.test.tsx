import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { AdminCalendar } from "@/features/admin/components/AdminCalendar";
import type {
  AdminCalendar as AdminCalendarData,
  AdminReservation,
} from "@/features/admin/logic/types";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import type { Facility } from "@/features/facility/logic/types";
import { addDays } from "@/lib/date";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;
const THIS_WEEK = "2026-10-05";
const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i);

const member: AdminReservation = {
  id: 1,
  date: "2026-10-07",
  start_hour: 10,
  end_hour: 12,
  hours: 2,
  price: 8000,
  status: "confirmed",
  phase: "before_start",
  is_cancellable: true,
  booker_name: "山田太郎",
  user_id: 5,
  is_phone: false,
};
// 定休日（月曜）に残った電話予約
const phone: AdminReservation = {
  ...member,
  id: 2,
  date: "2026-10-12",
  start_hour: 18,
  end_hour: 20,
  booker_name: "田中",
  user_id: null,
  is_phone: true,
};

function calendarOf(
  weekStart: string,
  reservations: AdminReservation[] = [member, phone],
): AdminCalendarData {
  return {
    meta: {
      today: "2026-10-07",
      bookable_until: "2026-11-07",
      oldest_date: "2026-07-07",
    },
    data: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const closed = i === 0;
      const ofDay = reservations.filter((r) => r.date === date);
      return {
        date,
        closed_reason: closed ? "regular_holiday" : null,
        reservations: ofDay,
        slots: HOURS.map((hour) => {
          const reservation = ofDay.find(
            (r) => r.start_hour <= hour && hour < r.end_hour,
          );
          return {
            hour,
            status: reservation ? "booked" : closed ? "closed" : "available",
            reservation_id: reservation?.id ?? null,
          };
        }),
      };
    }),
  };
}

let requestedWeeks: string[] = [];

function respondCalendar(reservations?: AdminReservation[]) {
  server.use(
    http.get("/api/admin/calendar", ({ request }) => {
      const from = new URL(request.url).searchParams.get("from") ?? "";
      requestedWeeks.push(from);
      return HttpResponse.json(calendarOf(from, reservations));
    }),
  );
}

function renderCalendar() {
  return renderWithClient(
    <FacilityProvider facility={facility}>
      <AdminCalendar />
    </FacilityProvider>,
  );
}

const MEMBER_SLOT = "10月7日（水） 10:00 〜 11:00 山田太郎 さんの予約";
const PHONE_SLOT = "10月12日（月） 18:00 〜 19:00 田中 さんの予約（電話）";

beforeEach(() => {
  requestedWeeks = [];
  respondCalendar();
  // 東京は 2026-10-07（水）
  jest.useFakeTimers({
    now: new Date("2026-10-07T03:00:00Z"),
    advanceTimers: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("表示", () => {
  test("今週を取り、予約済みの枠に予約者名を出す", async () => {
    renderCalendar();

    const cell = await screen.findByRole("button", { name: MEMBER_SLOT });
    expect(cell).toHaveTextContent("山田太郎");
    expect(requestedWeeks[0]).toBe(THIS_WEEK);
  });

  test("定休日に残った電話予約は、☎ 付きの名前で押せる", async () => {
    renderCalendar();
    await screen.findByRole("button", { name: MEMBER_SLOT });

    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));

    const cell = await screen.findByRole("button", { name: PHONE_SLOT });
    expect(cell).toHaveTextContent("☎ 田中");
    expect(cell).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: "10月12日（月） 10:00 〜 11:00 受付外",
      }),
    ).toBeDisabled();
  });

  test("前の週は、遡れる最初の日を含む週まで", async () => {
    server.use(
      http.get("/api/admin/calendar", ({ request }) => {
        const from = new URL(request.url).searchParams.get("from") ?? "";
        const calendar = calendarOf(from);
        // 9/30（水）を含む週は 9/28〜
        calendar.meta.oldest_date = "2026-09-30";
        return HttpResponse.json(calendar);
      }),
    );
    renderCalendar();
    await screen.findByRole("button", { name: MEMBER_SLOT });
    const prev = screen.getByRole("button", { name: "← 前の週" });

    await userEvent.click(prev);

    expect(screen.getByText("9/28 〜 10/4")).toBeInTheDocument();
    await waitFor(() => expect(prev).toBeDisabled());
  });

  test("次の週には制限なく進める", async () => {
    renderCalendar();
    await screen.findByRole("button", { name: MEMBER_SLOT });
    const next = screen.getByRole("button", { name: "次の週 →" });

    for (let i = 0; i < 6; i++) {
      await userEvent.click(next);
    }

    expect(screen.getByText("11/16 〜 11/22")).toBeInTheDocument();
    expect(next).toBeEnabled();
  });
});

describe("予約の詳細", () => {
  async function openDetail(name = MEMBER_SLOT) {
    await userEvent.click(await screen.findByRole("button", { name }));
    return screen.getByRole("dialog", { name: "予約の詳細" });
  }

  test("予約者・種別・日時・料金を出し、会員の予約ならメールの注意書きを出す", async () => {
    renderCalendar();

    const dialog = await openDetail();

    expect(dialog).toHaveTextContent("山田太郎");
    expect(dialog).toHaveTextContent("会員");
    expect(dialog).toHaveTextContent("2026年10月7日（水）");
    expect(dialog).toHaveTextContent("10:00 〜 12:00");
    expect(dialog).toHaveTextContent("¥8,000");
    expect(dialog).toHaveTextContent("会員にキャンセルのメールが送られます");
  });

  test("電話予約には注意書きを出さない", async () => {
    renderCalendar();
    await screen.findByRole("button", { name: MEMBER_SLOT });
    await userEvent.click(screen.getByRole("button", { name: "次の週 →" }));

    const dialog = await openDetail(PHONE_SLOT);

    expect(dialog).toHaveTextContent("電話");
    expect(dialog).not.toHaveTextContent("メールが送られます");
  });

  test("キャンセルできない予約には、キャンセルボタンを出さない", async () => {
    respondCalendar([{ ...member, phase: "in_use", is_cancellable: false }]);
    renderCalendar();

    const dialog = await openDetail();

    expect(
      within(dialog).queryByRole("button", { name: "この予約をキャンセル" }),
    ).not.toBeInTheDocument();
  });

  test("キャンセルできたら閉じて、取り直したカレンダーから消える", async () => {
    let cancelledId: string | undefined;
    server.use(
      http.post("/api/admin/reservations/:id/cancel", ({ params }) => {
        cancelledId = String(params.id);
        respondCalendar([phone]);
        return HttpResponse.json({
          data: { ...member, status: "cancelled", is_cancellable: false },
        });
      }),
    );
    renderCalendar();
    const dialog = await openDetail();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "この予約をキャンセル" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(cancelledId).toBe("1");
    expect(
      await screen.findByRole("button", {
        name: "10月7日（水） 10:00 〜 11:00 空き",
      }),
    ).toBeInTheDocument();
  });

  test("断られたら、ダイアログの中にエラーを出す", async () => {
    server.use(
      http.post("/api/admin/reservations/:id/cancel", () =>
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
    renderCalendar();
    const dialog = await openDetail();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "この予約をキャンセル" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "この予約はキャンセルできません",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("電話予約", () => {
  const FRI = "10月9日（金）";

  async function chooseTwoHours() {
    await userEvent.click(
      await screen.findByRole("button", { name: `${FRI} 12:00 〜 13:00 空き` }),
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: `${FRI} 13:00 〜 14:00 空き（終了候補）`,
      }),
    );
  }

  test("空きを開始・終了の順に選ぶと、電話予約のダイアログが開く", async () => {
    renderCalendar();

    await chooseTwoHours();

    const dialog = screen.getByRole("dialog", { name: "電話予約の登録" });
    expect(dialog).toHaveTextContent("2026年10月9日（金）");
    expect(dialog).toHaveTextContent("12:00 〜 14:00");
  });

  test("登録できたら、閉じてカレンダーを取り直し、メッセージにフォーカスを移す", async () => {
    let sent: unknown;
    server.use(
      http.post("/api/admin/reservations", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { id: 9 } }, { status: 201 });
      }),
    );
    renderCalendar();
    await chooseTwoHours();
    requestedWeeks = [];

    await userEvent.type(screen.getByLabelText("予約者名"), "田中{Enter}");

    const message = await screen.findByText("電話予約を登録しました。");
    expect(sent).toEqual({
      date: "2026-10-09",
      start_hour: 12,
      end_hour: 14,
      booker_name: "田中",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(message.closest("[tabindex]")).toHaveFocus();
    await waitFor(() => expect(requestedWeeks).toContain(THIS_WEEK));
  });
});
