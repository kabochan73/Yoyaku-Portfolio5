import { http, HttpResponse } from "msw";
import { serverFetch } from "@/lib/server-fetch";
import { server } from "@/test/msw/server";

let incomingCookie = "";
let incomingHeaders = new Headers();

jest.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => incomingCookie }),
  headers: async () => incomingHeaders,
}));

let received: Request | undefined;

beforeEach(() => {
  incomingCookie = "laravel_session=abc; XSRF-TOKEN=xyz";
  incomingHeaders = new Headers({ "x-forwarded-for": "203.0.113.9" });
  received = undefined;
  server.use(
    http.get("http://api.test/api/user", ({ request }) => {
      received = request;
      return HttpResponse.json({ data: { id: 1 } });
    }),
  );
});

test("API_URL の下のパスに、Cookie・利用者の IP・Referer を付けて送る", async () => {
  const response = await serverFetch("/user");

  expect(await response.json()).toEqual({ data: { id: 1 } });
  expect(received?.headers.get("Cookie")).toBe(
    "laravel_session=abc; XSRF-TOKEN=xyz",
  );
  expect(received?.headers.get("X-Forwarded-For")).toBe("203.0.113.9");
  expect(received?.headers.get("Referer")).toBe("http://frontend.test");
  expect(received?.headers.get("Accept")).toBe("application/json");
});

test("Cookie と利用者の IP が無ければ付けない", async () => {
  incomingCookie = "";
  incomingHeaders = new Headers();

  await serverFetch("/user");

  expect(received?.headers.get("Cookie")).toBeNull();
  expect(received?.headers.get("X-Forwarded-For")).toBeNull();
});
