import { revalidateTag } from "next/cache";
import { POST } from "@/app/internal/revalidate/route";

jest.mock("next/cache", () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
  revalidateTag: jest.fn(),
}));

function request(authorization?: string) {
  return new Request("http://localhost:3000/internal/revalidate", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : {},
  });
}

beforeEach(() => {
  jest.mocked(revalidateTag).mockClear();
});

test("秘密の文字列が正しければ、施設情報を次のアクセスで必ず作り直させる", async () => {
  const response = await POST(
    request(`Bearer ${process.env.REVALIDATE_SECRET}`),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ revalidated: true });
  expect(revalidateTag).toHaveBeenCalledWith("facility", { expire: 0 });
});

test.each([
  ["ヘッダーが無い", undefined],
  ["秘密の文字列が違う", "Bearer wrong-secret"],
])("%s なら 401 で、再検証しない", async (_, authorization) => {
  const response = await POST(request(authorization));

  expect(response.status).toBe(401);
  expect(revalidateTag).not.toHaveBeenCalled();
});
