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
        <p className="text-sm text-zinc-500">準備中</p>
      </section>
      <RulesSection />
    </FacilityProvider>
  );
}
