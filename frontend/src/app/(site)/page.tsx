import { Suspense } from "react";
import { BookingCalendar } from "@/features/calendar/components/BookingCalendar";
import { CalendarSkeleton } from "@/features/calendar/components/CalendarSkeleton";
import { getCalendar } from "@/features/calendar/logic/server";
import { FacilityInfo } from "@/features/facility/components/FacilityInfo";
import { FacilityProvider } from "@/features/facility/components/FacilityProvider";
import { Hero } from "@/features/facility/components/Hero";
import { RulesSection } from "@/features/facility/components/RulesSection";
import { getFacility } from "@/features/facility/logic/server";

export default async function Home() {
  const facility = await getFacility();

  return (
    <FacilityProvider facility={facility}>
      <Hero facility={facility} />
      <FacilityInfo facility={facility} />
      <section id="calendar" className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">空き状況・ご予約</h2>
        <Suspense
          fallback={
            <CalendarSkeleton
              openHour={facility.rules.open_hour}
              closeHour={facility.rules.close_hour}
            />
          }
        >
          <BookingCalendarSection />
        </Suspense>
      </section>
      <RulesSection />
    </FacilityProvider>
  );
}

// 古い空き状況を見せないよう、アクセスのたびにサーバーで今週を取る
async function BookingCalendarSection() {
  const calendar = await getCalendar();
  return <BookingCalendar initialCalendar={calendar} />;
}
