import type { ReactNode } from "react";

type Tone = "info" | "success" | "error";

const toneClasses: Record<Tone, string> = {
  info: "border-zinc-200 bg-white text-zinc-700",
  success: "border-green-200 bg-primary-soft text-green-800",
  error: "border-red-200 bg-danger-soft text-red-700",
};

export function Alert({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm whitespace-pre-line ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}
