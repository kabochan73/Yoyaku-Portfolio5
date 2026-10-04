"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FORM_FIELDS =
  "input:not([disabled]), select:not([disabled]), textarea:not([disabled])";
const FOCUSABLE = `${FORM_FIELDS}, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])`;

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closable?: boolean;
  children: ReactNode;
};

export function Dialog({
  open,
  onClose,
  title,
  closable = true,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
      const first =
        dialog.querySelector<HTMLElement>(FORM_FIELDS) ??
        dialog.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      }
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (closable) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && closable) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
