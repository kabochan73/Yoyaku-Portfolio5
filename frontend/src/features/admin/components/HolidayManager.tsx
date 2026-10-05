import { HolidayForm } from "./HolidayForm";
import { HolidayList } from "./HolidayList";

export function HolidayManager() {
  return (
    <div className="space-y-6">
      <HolidayForm />
      <HolidayList />
    </div>
  );
}
