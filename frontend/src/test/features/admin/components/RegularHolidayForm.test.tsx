import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { RegularHolidayForm } from "@/features/admin/components/RegularHolidayForm";
import type { Facility } from "@/features/facility/logic/types";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

// 定休日は月曜
const facility = facilityFixture.data as Facility;

let sent: unknown;

beforeEach(() => {
  sent = undefined;
  server.use(
    http.get("/api/facility", () => HttpResponse.json({ data: facility })),
    http.put("/api/admin/regular-holidays", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({
        data: {
          ...facility,
          regular_holidays: (sent as { days: number[] }).days,
        },
      });
    }),
  );
});

function day(name: string) {
  return screen.getByRole("button", { name });
}

test("施設情報が届く前は、保存ボタンを出さない", () => {
  renderWithClient(<RegularHolidayForm />);

  expect(
    screen.getByTestId("regular-holiday-form-loading"),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "保存する" })).toBeNull();
});

test("今の定休日が押された状態で、月曜から順に7つ並ぶ", async () => {
  renderWithClient(<RegularHolidayForm />);

  await screen.findByRole("button", { name: "保存する" });
  const buttons = screen.getAllByRole("button", { pressed: true });

  expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(["月曜日"]);
  expect(
    screen.getAllByRole("button", { name: /曜日$/ }).map((b) => b.textContent),
  ).toEqual(["月", "火", "水", "木", "金", "土", "日"]);
  expect(
    screen.getByText("すでに入っている予約はキャンセルされません。"),
  ).toBeInTheDocument();
});

test("押して切り替えて保存すると、選んだ曜日を送る", async () => {
  renderWithClient(<RegularHolidayForm />);
  await screen.findByRole("button", { name: "保存する" });

  await userEvent.click(day("月曜日"));
  await userEvent.click(day("日曜日"));
  await userEvent.click(day("水曜日"));
  await userEvent.click(screen.getByRole("button", { name: "保存する" }));

  expect(
    await screen.findByText("保存しました。トップページにも反映されました。"),
  ).toBeInTheDocument();
  expect(sent).toEqual({ days: [3, 0] });
  expect(day("月曜日")).toHaveAttribute("aria-pressed", "false");
  expect(day("水曜日")).toHaveAttribute("aria-pressed", "true");
});

test("すべて外して保存すると、定休日なしを送る", async () => {
  renderWithClient(<RegularHolidayForm />);
  await screen.findByRole("button", { name: "保存する" });

  await userEvent.click(day("月曜日"));
  await userEvent.click(screen.getByRole("button", { name: "保存する" }));

  await screen.findByText(/保存しました/);
  expect(sent).toEqual({ days: [] });
});
