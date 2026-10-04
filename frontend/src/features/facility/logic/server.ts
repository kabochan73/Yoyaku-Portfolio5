import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import type { Facility } from "./types";

export const FACILITY_TAG = "facility";

// ビルド中は内部ネットワークに届かないので、外から届く URL を使う
function apiBaseUrl(): string {
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    return env.API_URL;
  }

  if (env.BUILD_API_URL === undefined) {
    throw new Error(
      "BUILD_API_URL is required to fetch the facility during the build.",
    );
  }

  return env.BUILD_API_URL;
}

export async function getFacility(): Promise<Facility> {
  "use cache";
  cacheLife("max");
  cacheTag(FACILITY_TAG);

  const response = await fetch(`${apiBaseUrl()}/facility`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch the facility: ${response.status}`);
  }

  const body = (await response.json()) as { data: Facility };
  return body.data;
}
