const RULES = [
  "ご予約のキャンセルは、ご利用開始時刻までにマイページから行ってください。キャンセル料はかかりません。",
  "コート内での飲食（フタ付きの飲料は可）、喫煙は禁止です。",
  "施設・備品を破損・紛失された場合は、実費をご請求させていただきます。",
  "その他、スタッフの指示に従ってご利用ください。",
];

export function RulesSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="mb-4 text-xl font-bold">利用規約</h2>
      <ul className="list-disc space-y-2 rounded-lg border border-zinc-200 bg-white py-4 pr-4 pl-8 text-sm text-zinc-700">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
