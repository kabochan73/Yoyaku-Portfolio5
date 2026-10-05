import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MyReservationList } from "@/features/reservations/components/MyReservationList";
import type { Reservation } from "@/features/reservations/logic/types";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";

const upcoming: Reservation = {
  id: 1,
  date: "2026-10-07",
  start_hour: 12,
  end_hour: 14,
  hours: 2,
  price: 8000,
  status: "confirmed",
  phase: "before_start",
  is_cancellable: true,
  booker_name: "山田太郎",
};
const inUse: Reservation = {
  ...upcoming,
  id: 2,
  date: "2026-10-05",
  start_hour: 10,
  end_hour: 12,
  phase: "in_use",
  is_cancellable: false,
};
const finished: Reservation = {
  ...inUse,
  id: 3,
  start_hour: 8,
  end_hour: 10,
  phase: "finished",
};

const CANCEL_UPCOMING = "10月7日（水） 12:00 〜 14:00 の予約をキャンセル";

let listRequests = 0;

function respondList(...lists: Reservation[][]) {
  listRequests = 0;
  server.use(
    http.get("/api/user/reservations", () => {
      const list = lists[Math.min(listRequests, lists.length - 1)] ?? [];
      listRequests += 1;
      return HttpResponse.json({ data: list });
    }),
  );
}

function respondCancel(response: () => Response | Promise<Response>) {
  server.use(http.post("/api/reservations/:id/cancel", response));
}

describe("一覧", () => {
  test("読み込み中はカード2枚分のスケルトン", () => {
    respondList([upcoming]);
    renderWithClient(<MyReservationList />);

    expect(screen.getByTestId("reservations-loading")).toBeInTheDocument();
  });

  test("取得に失敗したら、エラーと再読み込み", async () => {
    server.use(
      http.get(
        "/api/user/reservations",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    renderWithClient(<MyReservationList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "予約を取得できませんでした。",
    );

    respondList([upcoming]);
    await userEvent.click(screen.getByRole("button", { name: "再読み込み" }));

    expect(
      await screen.findByRole("button", { name: CANCEL_UPCOMING }),
    ).toBeInTheDocument();
  });

  test("予約が無ければ、無いことと空き状況へのリンクを出す", async () => {
    respondList([]);
    renderWithClient(<MyReservationList />);

    expect(
      await screen.findByText("今後の予約はありません。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "空き状況を見る" }),
    ).toHaveAttribute("href", "/#calendar");
  });

  test("カードには日付・時間・料金を出し、利用の段階でボタンか表示が変わる", async () => {
    respondList([inUse, finished, upcoming]);
    renderWithClient(<MyReservationList />);

    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("ご利用中");
    expect(cards[1]).toHaveTextContent("ご利用済み");
    expect(cards[2]).toHaveTextContent("2026年10月7日（水）");
    expect(cards[2]).toHaveTextContent("12:00 〜 14:00（2時間）");
    expect(cards[2]).toHaveTextContent("¥8,000");
    expect(within(cards[0]!).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(cards[2]!).getByRole("button", { name: CANCEL_UPCOMING }),
    ).toBeInTheDocument();
  });
});

describe("キャンセル", () => {
  async function openDialog() {
    await userEvent.click(
      await screen.findByRole("button", { name: CANCEL_UPCOMING }),
    );
    return screen.getByRole("dialog", { name: "予約をキャンセルしますか？" });
  }

  test("確認ダイアログに予約の内容を出す", async () => {
    respondList([upcoming]);
    renderWithClient(<MyReservationList />);

    const dialog = await openDialog();

    expect(dialog).toHaveTextContent("2026年10月7日（水）");
    expect(dialog).toHaveTextContent("12:00 〜 14:00");
    expect(dialog).toHaveTextContent("¥8,000");
  });

  test("キャンセルできたら、一覧から消え、メッセージにフォーカスを移す", async () => {
    respondList([upcoming], []);
    let cancelledId: string | undefined;
    server.use(
      http.post("/api/reservations/:id/cancel", ({ params }) => {
        cancelledId = String(params.id);
        return HttpResponse.json({
          data: { ...upcoming, status: "cancelled", is_cancellable: false },
        });
      }),
    );
    renderWithClient(<MyReservationList />);
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "キャンセルする" }),
    );

    const message = await screen.findByText("予約をキャンセルしました。");
    expect(cancelledId).toBe("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText("今後の予約はありません。"),
    ).toBeInTheDocument();
    expect(message.closest("[tabindex]")).toHaveFocus();
  });

  test("送信中は「キャンセル中...」になり、閉じられない", async () => {
    respondList([upcoming]);
    let release = () => {};
    respondCancel(async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return HttpResponse.json({ data: upcoming });
    });
    renderWithClient(<MyReservationList />);
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "キャンセルする" }),
    );

    expect(
      await screen.findByRole("button", { name: "キャンセル中..." }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "戻る" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    release();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  test("キャンセルできない状態なら、ダイアログの中にエラーを出し、一覧を取り直す", async () => {
    respondList([upcoming], [{ ...inUse, id: 1 }]);
    respondCancel(() =>
      HttpResponse.json(
        {
          message:
            "この予約はキャンセルできません（開始済み、またはキャンセル済み）。",
          code: "reservation_not_cancellable",
        },
        { status: 409 },
      ),
    );
    renderWithClient(<MyReservationList />);
    await openDialog();

    await userEvent.click(
      screen.getByRole("button", { name: "キャンセルする" }),
    );

    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("この予約はキャンセルできません");
    await waitFor(() => expect(listRequests).toBe(2));
  });
});
