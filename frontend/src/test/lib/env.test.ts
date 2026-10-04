import { parseEnv } from "@/lib/env";

const valid = {
  API_URL: "http://backend:8080/api",
  FRONTEND_URL: "http://localhost:3000",
  REVALIDATE_SECRET: "secret",
};

test("正しい値なら型の付いた値として読める", () => {
  expect(
    parseEnv({ ...valid, BUILD_API_URL: "http://localhost:8000/api" }),
  ).toEqual({
    ...valid,
    BUILD_API_URL: "http://localhost:8000/api",
  });
});

test("BUILD_API_URL は無くてもよい", () => {
  expect(parseEnv(valid).BUILD_API_URL).toBeUndefined();
});

test.each([
  ["API_URL が無い", { ...valid, API_URL: undefined }],
  ["API_URL が URL でない", { ...valid, API_URL: "backend" }],
  ["REVALIDATE_SECRET が空", { ...valid, REVALIDATE_SECRET: "" }],
])("%s と止まる", (_, source) => {
  expect(() => parseEnv(source)).toThrow();
});
