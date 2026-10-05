import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { HolidayManager } from "@/features/admin/components/HolidayManager";
import type { Holiday } from "@/features/admin/logic/types";
import { todayInTokyo } from "@/lib/date";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

const inspection: Holiday = { id: 3, date: "2026-10-20", reason: "設備点検" };
const noReason: Holiday = { id: 4, date: "2026-10-27", reason: null };

let holidays: Holiday[] = [];
let posted: unknown[] = [];

function respondCreate(respond: (body: Record<string, unknown>) => Response) {
  server.use(
    http.post("/api/admin/holidays", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push(body);
      return respond(body);
    }),
  );
}

beforeEach(() => {
  holidays = [inspection];
  posted = [];
  server.use(
    http.get("/api/admin/holidays", () =>
      HttpResponse.json({ data: holidays }),
    ),
    http.delete("/api/admin/holidays/:id", ({ params }) => {
      holidays = holidays.filter((h) => String(h.id) !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  respondCreate((body) => {
    const created = { id: 9, date: String(body.date), reason: null };
    holidays = [...holidays, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  });
});

async function add(date: string, reason = "") {
  await userEvent.type(screen.getByLabelText("日付"), date);
  if (reason !== "") {
    await userEvent.type(screen.getByLabelText("理由（任意）"), reason);
  }
  await userEvent.click(screen.getByRole("button", { name: "休業日を追加" }));
}

describe("一覧", () => {
  test("読み込み中は行2つ分のスケルトン", () => {
    renderWithClient(<HolidayManager />);

    expect(screen.getByTestId("holidays-loading")).toBeInTheDocument();
  });

  test("日付と理由を並べる。理由が無ければ日付だけ", async () => {
    holidays = [inspection, noReason];
    renderWithClient(<HolidayManager />);

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("2026年10月20日（火） — 設備点検");
    expect(items[1]).toHaveTextContent("2026年10月27日（火）");
    expect(items[1]).not.toHaveTextContent("—");
  });

  test("無ければ、無いことを出す", async () => {
    holidays = [];
    renderWithClient(<HolidayManager />);

    expect(
      await screen.findByText("登録された休業日はありません。"),
    ).toBeInTheDocument();
  });
});

describe("追加", () => {
  test("日付は今日より前を選べない", () => {
    renderWithClient(<HolidayManager />);

    expect(screen.getByLabelText("日付")).toHaveAttribute(
      "min",
      todayInTokyo(),
    );
  });

  test("追加できたら、フォームを空に戻し、一覧に出る", async () => {
    renderWithClient(<HolidayManager />);
    await screen.findByText(/設備点検/);

    await add("2026-11-03", "研修");

    expect(posted).toEqual([{ date: "2026-11-03", reason: "研修" }]);
    expect(await screen.findByText("2026年11月3日（火）")).toBeInTheDocument();
    expect(screen.getByLabelText("日付")).toHaveValue("");
    expect(screen.getByLabelText("理由（任意）")).toHaveValue("");
  });

  test("すでに休業日なら、日付欄の下に出す", async () => {
    respondCreate(() =>
      HttpResponse.json(
        {
          message: "すでに休業日として登録されています。",
          code: "holiday_already_exists",
        },
        { status: 409 },
      ),
    );
    renderWithClient(<HolidayManager />);

    await add("2026-10-20");

    expect(
      await screen.findByText("すでに休業日として登録されています。"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("日付")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("予約がある日", () => {
  beforeEach(() => {
    respondCreate((body) => {
      if (body.cancel_reservations !== true) {
        return HttpResponse.json(
          {
            message:
              "この日には2件の予約があります。すべてキャンセルして休業日にしますか？",
            code: "holiday_has_reservations",
            reservation_count: 2,
          },
          { status: 409 },
        );
      }
      return HttpResponse.json(
        { data: { id: 9, date: body.date, reason: body.reason } },
        { status: 201 },
      );
    });
  });

  test("件数を出して確認し、承認したら予約のキャンセル付きで送り直す", async () => {
    renderWithClient(<HolidayManager />);

    await add("2026-11-03", "設備故障");

    const dialog = await screen.findByRole("dialog", {
      name: "この日には予約が2件あります",
    });
    expect(dialog).toHaveTextContent(
      "2件の予約をすべてキャンセルし、会員の方には施設都合のキャンセルメールを送ります。",
    );

    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "予約をキャンセルして休業日にする",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(posted).toEqual([
      { date: "2026-11-03", reason: "設備故障" },
      { date: "2026-11-03", reason: "設備故障", cancel_reservations: true },
    ]);
    expect(screen.getByLabelText("日付")).toHaveValue("");
  });

  test("戻るなら送り直さず、入力を残す", async () => {
    renderWithClient(<HolidayManager />);

    await add("2026-11-03");
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "戻る" }));

    expect(posted).toHaveLength(1);
    expect(screen.getByLabelText("日付")).toHaveValue("2026-11-03");
  });
});

describe("削除", () => {
  test("確認してから削除し、一覧から消えて見出しにフォーカスが移る", async () => {
    renderWithClient(<HolidayManager />);

    await userEvent.click(
      await screen.findByRole("button", {
        name: "10月20日（火）の休業日を削除",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "休業日を解除しますか？",
    });
    expect(dialog).toHaveTextContent("キャンセルした予約は元に戻りません");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "解除する" }),
    );

    expect(
      await screen.findByText("登録された休業日はありません。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "登録済みの休業日" }),
    ).toHaveFocus();
  });
});
