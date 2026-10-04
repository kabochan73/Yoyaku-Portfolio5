import { api } from "@/lib/api-client";
import type { Facility } from "./types";

export async function fetchFacility(): Promise<Facility> {
  const { data } = await api.get<{ data: Facility }>("/facility");
  return data.data;
}
