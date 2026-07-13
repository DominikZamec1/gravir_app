"use client";

import { useState, useTransition } from "react";
import type { ItemRow } from "@/lib/types";
import { renderEmoji } from "@/lib/format";
import { setEngraved } from "@/app/actions";

// dxfHref se počítá na serveru (SUPABASE_URL není na klientovi dostupná).
export default function ItemCard({ item, dxfHref }: { item: ItemRow; dxfHref: string | null }) {
  const [engraved, setLocal] = useState(item.engraved);
  const [pending, start] = useTransition();
  const url = dxfHref;

  function toggle() {
    const next = !engraved;
    setLocal(next); // optimistic
    start(async () => {
      try {
        await setEngraved(item.id, item.order_id, next);
      } catch {
        setLocal(!next); // rollback
      }
    });
  }

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        engraved
          ? "border-green-200 bg-[var(--ok-soft)]"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono">EAN {item.ean}</span>
            {item.qty > 1 && <span className="rounded-md bg-slate-100 px-2 py-0.5">{item.qty}×</span>}
            <MatchBadge type={item.match_type} />
          </div>
          <p className="mt-2 text-2xl font-bold leading-tight text-slate-900">
            {renderEmoji(item.text) || <span className="text-slate-400">— bez textu —</span>}
          </p>
          {item.text && (
            <p className="mt-1 font-mono text-sm text-slate-400">({item.text})</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {url ? (
            <a
              href={url}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:bg-indigo-50"
            >
              ⬇ Stáhnout DXF
              <span className="font-mono text-xs opacity-60">#{item.matched_cislo}</span>
            </a>
          ) : (
            <span className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-400">
              DXF nenalezen
            </span>
          )}
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={pending}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
          engraved
            ? "bg-green-600 text-white"
            : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {engraved ? "✓ Vygravírováno" : "Označit jako vygravírováno"}
      </button>
    </div>
  );
}

function MatchBadge({ type }: { type: ItemRow["match_type"] }) {
  if (type === "exact")
    return <span className="rounded-md bg-[var(--ok-soft)] px-2 py-0.5 text-[var(--ok-ink)]">přesná shoda</span>;
  if (type === "ean")
    return <span className="rounded-md bg-[var(--wait-soft)] px-2 py-0.5 text-[var(--wait-ink)]">dle EANu</span>;
  return <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700">nespárováno</span>;
}
