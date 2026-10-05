"use client";

import { Accordion } from "@/components/ui/Accordion";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { HolidayManager } from "./HolidayManager";
import { PriceForm } from "./PriceForm";
import { RegularHolidayForm } from "./RegularHolidayForm";

export function AdminSettings() {
  return (
    <div className="space-y-3">
      <Accordion title="料金設定">
        <PriceForm />
      </Accordion>
      <Accordion title="定休日設定">
        <RegularHolidayForm />
      </Accordion>
      <Accordion title="臨時休業日">
        <HolidayManager />
      </Accordion>
      <Accordion title="プロフィール設定">
        <ProfileForm />
      </Accordion>
    </div>
  );
}
