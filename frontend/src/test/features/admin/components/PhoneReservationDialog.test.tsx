import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { PhoneReservationDialog } from "@/features/admin/components/PhoneReservationDialog";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import type { Facility } from "@/features/facility/logic/types";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;
// 2026-10-10 は土曜（土日 ¥5,000 × 2時間）
const slot = { date: "2026-10-10", start_hour: 12, end_hour: 14 };

let sent: unknown;

function renderDialog() {
  const onClose = jest.fn();
  const onReserved = jest.fn();
  renderWithClient(
    <FacilityProvider facility={facility}>
      <PhoneReservationDialog
        slot={slot}
        onClose={onClose}
        onReserved={onReserved}
      />
    </FacilityProvider>,
  );
  return { onClose, onReserved };
}

beforeEach(() => {
  sent = undefined;
  server.use(
    http.post("/api/admin/reservations", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ data: { id: 9 } }, { status: 201 });
    }),
  );
});

test("日時と見積もりの料金を出し、予約者名の欄にフォーカスが入る", async () => {
  renderDialog();

  const dialog = screen.getByRole("dialog", { name: "電話予約の登録" });
  expect(dialog).toHaveTextContent("2026年10月10日（土）");
  expect(dialog).toHaveTextContent("12:00 〜 14:00");
  expect(dialog).toHaveTextContent("¥10,000");
  await waitFor(() => expect(screen.getByLabelText("予約者名")).toHaveFocus());
});

test("予約者名を入れて Enter で登録できる", async () => {
  const { onReserved } = renderDialog();

  await userEvent.type(screen.getByLabelText("予約者名"), "田中{Enter}");

  await waitFor(() => expect(onReserved).toHaveBeenCalled());
  expect(sent).toEqual({ ...slot, booker_name: "田中" });
});

test("予約者名が空なら、欄の下にエラーを出して送らない", async () => {
  renderDialog();

  await userEvent.click(screen.getByRole("button", { name: "登録する" }));

  expect(
    await screen.findByText("予約者名を入力してください。"),
  ).toBeInTheDocument();
  expect(sent).toBeUndefined();
});

test("送信中は「登録中...」になり、戻るも Esc も効かない", async () => {
  let release = () => {};
  server.use(
    http.post("/api/admin/reservations", async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return HttpResponse.json({ data: { id: 9 } }, { status: 201 });
    }),
  );
  const { onClose, onReserved } = renderDialog();

  await userEvent.type(screen.getByLabelText("予約者名"), "田中{Enter}");

  expect(
    await screen.findByRole("button", { name: "登録中..." }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "戻る" })).toBeDisabled();
  await userEvent.keyboard("{Escape}");
  expect(onClose).not.toHaveBeenCalled();

  release();
  await waitFor(() => expect(onReserved).toHaveBeenCalled());
});

test("先に予約されたら、エラーを出して登録するを押せなくする", async () => {
  server.use(
    http.post("/api/admin/reservations", () =>
      HttpResponse.json(
        { message: "その時間帯は先に予約されました。", code: "slot_taken" },
        { status: 409 },
      ),
    ),
  );
  const { onReserved } = renderDialog();

  await userEvent.type(screen.getByLabelText("予約者名"), "田中{Enter}");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "その時間帯は先に予約されました。",
  );
  expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  expect(onReserved).not.toHaveBeenCalled();
});
