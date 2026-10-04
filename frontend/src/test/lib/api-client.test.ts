import { http, HttpResponse } from "msw";
import { api } from "@/lib/api-client";
import { ApiError, NETWORK_ERROR_MESSAGE } from "@/lib/api-error";
import { server } from "@/test/msw/server";

async function errorOf(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (error) {
    if (error instanceof ApiError) {
      return error;
    }
    throw error;
  }
  throw new Error("エラーになりませんでした");
}

test("成功したら応答をそのまま返す", async () => {
  server.use(
    http.get("/api/facility", () =>
      HttpResponse.json({ data: { name: "FUTSAL PARK" } }),
    ),
  );

  const response = await api.get("/facility");

  expect(response.data).toEqual({ data: { name: "FUTSAL PARK" } });
});

test("422 は項目ごとのエラーを持つ ApiError になる", async () => {
  server.use(
    http.post("/api/register", () =>
      HttpResponse.json(
        {
          message: "入力内容を確認してください。",
          code: "validation_failed",
          errors: { email: ["このメールアドレスはすでに使われています。"] },
        },
        { status: 422 },
      ),
    ),
  );

  const error = await errorOf(api.post("/register", {}));

  expect(error.status).toBe(422);
  expect(error.code).toBe("validation_failed");
  expect(error.message).toBe("入力内容を確認してください。");
  expect(error.fieldErrors).toEqual({
    email: ["このメールアドレスはすでに使われています。"],
  });
});

test("409 は code と追加の情報を持つ", async () => {
  server.use(
    http.post("/api/admin/holidays", () =>
      HttpResponse.json(
        {
          message: "この日には2件の予約があります。",
          code: "holiday_has_reservations",
          reservation_count: 2,
        },
        { status: 409 },
      ),
    ),
  );

  const error = await errorOf(api.post("/admin/holidays", {}));

  expect(error.status).toBe(409);
  expect(error.code).toBe("holiday_has_reservations");
  expect(error.fieldErrors).toEqual({});
  expect(error.body).toMatchObject({ reservation_count: 2 });
});

test("通信できなければ決まったメッセージの ApiError になる", async () => {
  server.use(http.get("/api/facility", () => HttpResponse.error()));

  const error = await errorOf(api.get("/facility"));

  expect(error.status).toBe(0);
  expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
});

describe("419（CSRF トークン切れ）", () => {
  test("CSRF の Cookie を取り直して、1回だけ送り直す", async () => {
    let attempts = 0;
    let csrfRequested = false;
    server.use(
      http.get("/sanctum/csrf-cookie", () => {
        csrfRequested = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post("/api/reservations", () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ code: "csrf_token_mismatch" }, { status: 419 })
          : HttpResponse.json({ data: { id: 1 } }, { status: 201 });
      }),
    );

    const response = await api.post("/reservations", {});

    expect(csrfRequested).toBe(true);
    expect(attempts).toBe(2);
    expect(response.status).toBe(201);
  });

  test("2回続けて 419 ならエラーにする", async () => {
    let attempts = 0;
    server.use(
      http.get(
        "/sanctum/csrf-cookie",
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.post("/api/reservations", () => {
        attempts += 1;
        return HttpResponse.json(
          {
            message: "ページの有効期限が切れました。",
            code: "csrf_token_mismatch",
          },
          { status: 419 },
        );
      }),
    );

    const error = await errorOf(api.post("/reservations", {}));

    expect(attempts).toBe(2);
    expect(error.status).toBe(419);
    expect(error.code).toBe("csrf_token_mismatch");
  });
});
