import { revalidateTag } from "next/cache";
import { FACILITY_TAG } from "@/features/facility/logic/server";
import { isAuthorizedBearer } from "@/lib/bearer";
import { env } from "@/lib/env";

// 料金・定休日が変わった後にバックエンドから呼ばれる
export async function POST(request: Request) {
  if (
    !isAuthorizedBearer(
      request.headers.get("authorization"),
      env.REVALIDATE_SECRET,
    )
  ) {
    return Response.json({ message: "unauthorized" }, { status: 401 });
  }

  // "max" だと、変更直後の1人目に古い料金が見える
  revalidateTag(FACILITY_TAG, { expire: 0 });

  return Response.json({ revalidated: true });
}
