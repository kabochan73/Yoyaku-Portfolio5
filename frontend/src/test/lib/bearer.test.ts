import { isAuthorizedBearer } from "@/lib/bearer";

const SECRET = "local-revalidate-secret";

test("Bearer と秘密の文字列が一致すれば通す", () => {
  expect(isAuthorizedBearer(`Bearer ${SECRET}`, SECRET)).toBe(true);
});

test.each([
  ["ヘッダーが無い", null],
  ["Bearer が無い", SECRET],
  ["秘密の文字列が違う", "Bearer wrong-secret"],
  ["長さが違う", `Bearer ${SECRET}x`],
  ["空", "Bearer "],
])("%s なら通さない", (_, header) => {
  expect(isAuthorizedBearer(header, SECRET)).toBe(false);
});
