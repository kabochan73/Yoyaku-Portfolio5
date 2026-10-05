import { getFacility } from "@/features/facility/logic/server";
import { formatHourRange } from "@/lib/format";

export async function Footer() {
  const facility = await getFacility();

  return (
    <footer className="bg-zinc-900 py-8 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-10 px-4">
        <div className="flex flex-wrap gap-10">
          <div>
            <a
              href={`tel:${facility.phone}`}
              className="font-bold hover:underline"
            >
              {facility.phone}
            </a>
            <p className="text-xs text-zinc-400">
              受付時間{" "}
              {formatHourRange(
                facility.rules.open_hour,
                facility.rules.close_hour,
              )}
            </p>
            <a
              href={`mailto:${facility.email}`}
              className="text-xs text-zinc-400 hover:underline"
            >
              {facility.email}
            </a>
            <address className="text-sm not-italic">{facility.address}</address>
          </div>
        </div>
        <p className="text-2xl font-bold tracking-wide">{facility.name}</p>
      </div>
    </footer>
  );
}
