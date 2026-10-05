import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { PriceForm } from "@/features/admin/components/PriceForm";
import type { Facility } from "@/features/facility/logic/types";
import { queryKeys } from "@/lib/query-keys";
import { server } from "@/test/msw/server";
import { renderWithClient } from "@/test/render";
import facilityFixture from "@/test/fixtures/facility.json";

const facility = facilityFixture.data as Facility;
const WEEKDAY = "平日（円/時間）";
const WEEKEND = "土日（円/時間）";

let sent: unknown;

function respondFacility(
  respond: () => Response | Promise<Response> = () =>
    HttpResponse.json({ data: facility }),
) {
  server.use(http.get("/api/facility", respond));
}

async function replace(label: string, value: string) {
  await userEvent.clear(screen.getByLabelText(label));
  if (value !== "") {
    await userEvent.type(screen.getByLabelText(label), value);
  }
}

beforeEach(() => {
  sent = undefined;
  respondFacility();
  server.use(
    http.put("/api/admin/prices", async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({
        data: { ...facility, prices: sent },
      });
    }),
  );
});

test("施設情報が届く前は、保存ボタンを出さない。届いたら今の値が入る", async () => {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  respondFacility(async () => {
    await released;
    return HttpResponse.json({ data: facility });
  });
  renderWithClient(<PriceForm />);

  expect(screen.getByTestId("price-form-loading")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "保存する" })).toBeNull();

  release();

  expect(await screen.findByLabelText(WEEKDAY)).toHaveValue("4000");
  expect(screen.getByLabelText(WEEKEND)).toHaveValue("5000");
  expect(screen.getByRole("button", { name: "保存する" })).toBeEnabled();
});

test("取得に失敗したら、エラーと再読み込み", async () => {
  respondFacility(() => new HttpResponse(null, { status: 500 }));
  renderWithClient(<PriceForm />);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "料金を取得できませんでした。",
  );
  expect(screen.queryByRole("button", { name: "保存する" })).toBeNull();
});

test.each([
  ["空欄", "", "平日料金を入力してください。"],
  ["小数", "1.5", "平日料金は0以上の整数で入力してください。"],
  ["負の数", "-1", "平日料金は0以上の整数で入力してください。"],
])("%s は欄の下にエラーを出し、送らない", async (_, value, message) => {
  renderWithClient(<PriceForm />);
  await screen.findByLabelText(WEEKDAY);

  await replace(WEEKDAY, value);
  await userEvent.click(screen.getByRole("button", { name: "保存する" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(sent).toBeUndefined();
});

test("保存できたら、数値で送り、メッセージを出して施設情報を置き換える", async () => {
  const { queryClient } = renderWithClient(<PriceForm />);
  await screen.findByLabelText(WEEKDAY);

  await replace(WEEKDAY, "4500");
  await userEvent.click(screen.getByRole("button", { name: "保存する" }));

  expect(
    await screen.findByText("保存しました。トップページにも反映されました。"),
  ).toBeInTheDocument();
  expect(sent).toEqual({ weekday: 4500, weekend: 5000 });
  expect(
    queryClient.getQueryData<Facility>(queryKeys.facility)?.prices,
  ).toEqual({ weekday: 4500, weekend: 5000 });
  await waitFor(() =>
    expect(screen.getByLabelText(WEEKDAY)).toHaveValue("4500"),
  );

  await userEvent.type(screen.getByLabelText(WEEKEND), "0");

  expect(screen.queryByText(/保存しました/)).toBeNull();
});
