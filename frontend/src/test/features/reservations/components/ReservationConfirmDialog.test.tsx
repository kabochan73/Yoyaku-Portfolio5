import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { User } from "@/features/auth/logic/types";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import type { Facility } from "@/features/facility/logic/types";
import { ReservationConfirmDialog } from "@/features/reservations/components/ReservationConfirmDialog";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const facility = facilityFixture.data as Facility;
const member: User = {
  id: 1,
  name: "山田太郎",
  email: "taro@example.com",
  role: "user",
};
// 2026-10-07 は水曜（平日 ¥4,000 × 2時間）
const slot = { date: "2026-10-07", start_hour: 12, end_hour: 14 };

function signedInAs(user: User | null) {
  server.use(
    http.get("/api/user", () =>
      user
        ? HttpResponse.json({ data: user })
        : HttpResponse.json({ code: "unauthenticated" }, { status: 401 }),
    ),
  );
}

function respondReservation(response: () => Response | Promise<Response>) {
  server.use(http.post("/api/reservations", response));
}

function renderDialog() {
  const onClose = jest.fn();
  const onReserved = jest.fn();
  renderWithClient(
    <FacilityProvider facility={facility}>
      <ReservationConfirmDialog
        slot={slot}
        onClose={onClose}
        onReserved={onReserved}
      />
    </FacilityProvider>,
  );
  return { onClose, onReserved };
}

async function reserveButton() {
  const button = await screen.findByRole("button", { name: "予約する" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

beforeEach(() => {
  push.mockClear();
});

test("日付・時間・利用時間・見積もりの料金を出す", async () => {
  signedInAs(member);
  renderDialog();

  const dialog = await screen.findByRole("dialog", { name: "予約内容の確認" });
  expect(dialog).toHaveTextContent("2026年10月7日（水）");
  expect(dialog).toHaveTextContent("12:00 〜 14:00");
  expect(dialog).toHaveTextContent("2時間");
  expect(dialog).toHaveTextContent("¥8,000");
});

test("未ログインなら、ログインが必要と出し、ログイン画面へ移動させる", async () => {
  signedInAs(null);
  renderDialog();

  await userEvent.click(
    await screen.findByRole("button", { name: "ログインして予約" }),
  );

  expect(screen.getByText("予約にはログインが必要です。")).toBeInTheDocument();
  expect(push).toHaveBeenCalledWith("/login");
});

test("管理者には予約するボタンを出さず、管理画面の電話予約へ案内する", async () => {
  signedInAs({ ...member, role: "admin" });
  renderDialog();

  expect(
    await screen.findByText(
      "管理者は、管理画面の電話予約から登録してください。",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "管理画面へ" })).toHaveAttribute(
    "href",
    "/admin",
  );
  expect(screen.queryByRole("button", { name: "予約する" })).toBeNull();
});

test("送信中は「予約中...」になり、戻るも Esc も効かない", async () => {
  signedInAs(member);
  let release = () => {};
  respondReservation(async () => {
    await new Promise<void>((resolve) => (release = resolve));
    return HttpResponse.json({ data: { id: 1 } }, { status: 201 });
  });
  const { onClose, onReserved } = renderDialog();

  await userEvent.click(await reserveButton());

  expect(
    await screen.findByRole("button", { name: "予約中..." }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "戻る" })).toBeDisabled();
  await userEvent.keyboard("{Escape}");
  expect(onClose).not.toHaveBeenCalled();

  release();
  await waitFor(() => expect(onReserved).toHaveBeenCalled());
});

test("先に予約されたら、ダイアログの中にエラーを出し、予約するを押せなくする", async () => {
  signedInAs(member);
  respondReservation(() =>
    HttpResponse.json(
      { message: "その時間帯は先に予約されました。", code: "slot_taken" },
      { status: 409 },
    ),
  );
  const { onReserved } = renderDialog();

  await userEvent.click(await reserveButton());

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "その時間帯は先に予約されました。",
  );
  expect(screen.getByRole("button", { name: "予約する" })).toBeDisabled();
  expect(onReserved).not.toHaveBeenCalled();
});

test("同じ日に予約があれば、マイページへのリンクを出す", async () => {
  signedInAs(member);
  respondReservation(() =>
    HttpResponse.json(
      {
        message: "この日はすでにご予約があります（1日1件まで）。",
        code: "already_booked_that_day",
      },
      { status: 409 },
    ),
  );
  renderDialog();

  await userEvent.click(await reserveButton());

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("この日はすでにご予約があります");
  expect(
    screen.getByRole("link", { name: "マイページで確認" }),
  ).toHaveAttribute("href", "/mypage");
  expect(screen.getByRole("button", { name: "予約する" })).toBeEnabled();
});

test("422 なら、サーバーのメッセージをダイアログの中に出す", async () => {
  signedInAs(member);
  respondReservation(() =>
    HttpResponse.json(
      {
        message: "開始時刻を過ぎています。",
        code: "validation_failed",
        errors: { start_hour: ["開始時刻を過ぎています。"] },
      },
      { status: 422 },
    ),
  );
  renderDialog();

  await userEvent.click(await reserveButton());

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "開始時刻を過ぎています。",
  );
});
