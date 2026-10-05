import { getFacility } from "@/features/facility/logic/server";
import { formatHourRange } from "@/lib/format";

export async function Footer() {
  const facility = await getFacility();

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-sm text-zinc-500">
        <p className="text-base font-bold text-zinc-900">{facility.name}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>電話番号</dt>
          <dd>
            <a href={`tel:${facility.phone}`} className="hover:underline">
              {facility.phone}
            </a>
          </dd>
          <dt>受付時間</dt>
          <dd>
            {formatHourRange(
              facility.rules.open_hour,
              facility.rules.close_hour,
            )}
          </dd>
          <dt>メール</dt>
          <dd>
            <a href={`mailto:${facility.email}`} className="hover:underline">
              {facility.email}
            </a>
          </dd>
          <dt>住所</dt>
          <dd>{facility.address}</dd>
        </dl>
      </div>
    </footer>
  );
}
