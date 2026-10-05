import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// 比べる時間から秘密の文字列を推測されないよう timingSafeEqual を使う。長さをそろえるためにハッシュにしてから比べる
export function isAuthorizedBearer(
  header: string | null,
  secret: string,
): boolean {
  if (header === null || !header.startsWith("Bearer ")) {
    return false;
  }

  return timingSafeEqual(
    digest(header.slice("Bearer ".length)),
    digest(secret),
  );
}
