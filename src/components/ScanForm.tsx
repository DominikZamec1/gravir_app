"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { lookupByQR } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--brand)] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-900/30 transition active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Hledám…" : "Najít"}
    </button>
  );
}

export default function ScanForm() {
  const ref = useRef<HTMLInputElement>(null);

  // Čtečka se chová jako klávesnice → skenovací pole držíme ve focusu.
  // ALE nekrademe focus, když uživatel klikne do jiného pole/tlačítka/odkazu
  // (jinak by nešlo psát do filtru).
  useEffect(() => {
    const el = ref.current;
    el?.focus();
    const refocus = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, button, a, label, [contenteditable="true"]')) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== el && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
      setTimeout(() => el?.focus(), 50);
    };
    window.addEventListener("click", refocus);
    return () => window.removeEventListener("click", refocus);
  }, []);

  return (
    <form action={lookupByQR} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl">📷</span>
        <input
          ref={ref}
          name="qr"
          autoComplete="off"
          autoFocus
          placeholder="Naskenuj QR kód balíčku…"
          className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-14 pr-4 font-mono text-lg tracking-wide text-slate-900 shadow-sm outline-none ring-[var(--brand)] placeholder:text-slate-400 focus:ring-2"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
