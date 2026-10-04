import { http, HttpResponse } from "msw";
import { cacheLife, cacheTag } from "next/cache";
import { getFacility } from "@/features/facility/logic/server";
import facilityResponse from "@/test/fixtures/facility.json";
import { server } from "@/test/msw/server";

jest.mock("next/cache", () => ({ cacheLife: jest.fn(), cacheTag: jest.fn() }));

afterEach(() => {
  delete process.env.NEXT_PHASE;
});

test("facility のタグと最長の期限でキャッシュし、API_URL から取る", async () => {
  server.use(
    http.get("http://api.test/api/facility", () =>
      HttpResponse.json(facilityResponse),
    ),
  );

  expect(await getFacility()).toEqual(facilityResponse.data);
  expect(cacheTag).toHaveBeenCalledWith("facility");
  expect(cacheLife).toHaveBeenCalledWith("max");
});

test("ビルド中は BUILD_API_URL から取る", async () => {
  process.env.NEXT_PHASE = "phase-production-build";
  server.use(
    http.get("http://build.test/api/facility", () =>
      HttpResponse.json(facilityResponse),
    ),
  );

  expect(await getFacility()).toEqual(facilityResponse.data);
});

test("API がエラーなら止まる", async () => {
  server.use(
    http.get(
      "http://api.test/api/facility",
      () => new HttpResponse(null, { status: 500 }),
    ),
  );

  await expect(getFacility()).rejects.toThrow("500");
});

test("ビルド中に BUILD_API_URL が無ければ止まる", async () => {
  const buildApiUrl = process.env.BUILD_API_URL;
  delete process.env.BUILD_API_URL;
  process.env.NEXT_PHASE = "phase-production-build";

  await jest.isolateModulesAsync(async () => {
    const isolated = await import("@/features/facility/logic/server");
    await expect(isolated.getFacility()).rejects.toThrow("BUILD_API_URL");
  });

  process.env.BUILD_API_URL = buildApiUrl;
});
