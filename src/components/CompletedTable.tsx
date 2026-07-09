"use client";

import { useRouter } from "next/navigation";
import type { CompletedEngraving } from "@/lib/queries";
import { renderEmoji, formatShort } from "@/lib/format";

export default function CompletedTable({ rows }: { rows: CompletedEngraving[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-white/80 p-6 text-center text-slate-500">
        Zatím žádné gravíry označené jako hotové.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3 font-semibold">Dokončeno</th>
            <th className="px-4 py-3 font-semibold">Text</th>
            <th className="px-4 py-3 font-semibold">EAN</th>
            <th className="px-4 py-3 font-semibold">DXF</th>
            <th className="px-4 py-3 font-semibold">Objednávka</th>
            <th className="px-4 py-3 font-semibold">Klient</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => router.push(`/order/${r.order_id}`)}
              className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatShort(r.engraved_at)}</td>
              <td className="px-4 py-3 text-lg font-bold text-slate-900">
                {renderEmoji(r.text) || <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.ean}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {r.matched_cislo ? `#${r.matched_cislo}` : "—"}
              </td>
              <td className="px-4 py-3 font-semibold text-slate-900">{r.external_id ?? r.order_id}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">{r.client_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
