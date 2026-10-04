"use client";

import { useState, type ReactNode } from "react";

export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details open={open} className="rounded-md border border-zinc-200 bg-white">
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
        className="cursor-pointer px-4 py-3 font-medium select-none"
      >
        {title}
      </summary>
      {open && <div className="border-t border-zinc-200 p-4">{children}</div>}
    </details>
  );
}
