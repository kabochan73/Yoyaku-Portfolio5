const RULES = [
  "ご予約のキャンセルは、ご利用開始時刻までにマイページから行ってください。",
  "コート内での飲食（フタ付きの飲料は可）、喫煙は禁止です。",
  "施設・備品を破損・紛失された場合は、実費をご請求させていただきます。",
  "その他、スタッフの指示に従ってご利用ください。",
];

export function RulesSection() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-4 text-xl font-bold text-zinc-900">利用規約</h2>
        <div className="rounded-xl border border-zinc-200 p-6">
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
