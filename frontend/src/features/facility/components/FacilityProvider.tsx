"use client";

import type { ReactNode } from "react";
import { FacilityContext } from "../logic/hooks";
import type { Facility } from "../logic/types";

export function FacilityProvider({
  facility,
  children,
}: {
  facility: Facility;
  children: ReactNode;
}) {
  return <FacilityContext value={facility}>{children}</FacilityContext>;
}
