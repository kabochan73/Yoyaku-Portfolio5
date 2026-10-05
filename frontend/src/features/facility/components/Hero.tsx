import { buttonClassName } from "@/components/ui/Button";
import type { Facility } from "../logic/types";

export function Hero({ facility }: { facility: Facility }) {
  return (
    <section className="bg-primary-soft">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            屋内人工芝フットサルコート（1面）
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{facility.name}</h1>
        </div>
        <ul className="space-y-1 text-sm text-zinc-700">
          <li>
            電話：
            <a href={`tel:${facility.phone}`} className="hover:underline">
              {facility.phone}
            </a>
          </li>
          <li>住所：{facility.address}</li>
          <li>
            メール：
            <a href={`mailto:${facility.email}`} className="hover:underline">
              {facility.email}
            </a>
          </li>
        </ul>
        <a href="#calendar" className={buttonClassName()}>
          空き状況を見る
        </a>
      </div>
    </section>
  );
}
