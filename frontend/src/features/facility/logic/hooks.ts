import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { queryKeys } from "@/lib/query-keys";
import { fetchFacility } from "./api";
import type { Facility } from "./types";

export const FacilityContext = createContext<Facility | null>(null);

// ブラウザから取ると Laravel と DB まで届くので、一度取ったら取り直さない
export function useFacility() {
  const fromServer = useContext(FacilityContext);

  return useQuery({
    queryKey: queryKeys.facility,
    queryFn: fetchFacility,
    staleTime: Infinity,
    initialData: fromServer ?? undefined,
  });
}
