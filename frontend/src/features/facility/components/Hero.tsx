import Image from "next/image";
import { formatHourRange } from "@/lib/format";
import type { Facility } from "../logic/types";

export function Hero({ facility }: { facility: Facility }) {
  return (
    <section className="relative h-96 w-full overflow-hidden">
      <Image
        src="/court.png"
        alt="屋内フットサルコート"
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="object-cover"
      />
      {/* 写真の上でも文字が読めるよう、左側を白くぼかす */}
      <div className="absolute inset-0 bg-linear-to-r from-white via-white/80 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-4">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-primary">
            屋内人工芝フットサルコート
          </p>
          <h1 className="mt-2 text-4xl font-bold text-zinc-900">
            {facility.name}
          </h1>
          <p className="mt-4 text-zinc-600">
            快適な屋内コートで、フットサルを楽しもう!
          </p>
          <div className="mt-6 flex flex-col gap-2 text-sm text-zinc-700">
            <p>
              <a href={`tel:${facility.phone}`}>{facility.phone}</a>
              　受付時間{" "}
              {formatHourRange(
                facility.rules.open_hour,
                facility.rules.close_hour,
              )}
            </p>
            <p>{facility.address}</p>
            <p>
              <a href={`mailto:${facility.email}`}>{facility.email}</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
