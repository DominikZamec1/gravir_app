"use client";

import { useRouter } from "next/navigation";
import type { OrderListItem } from "@/lib/queries";
import { formatShort } from "@/lib/format";

export default function OrdersTable({ orders }: { orders: OrderListItem[] }) {
  const router = useRouter();

  if (orders.length === 0) {
    return (
      <p className="rounded-2xl bg-white/80 p-6 text-center text-slate-500">
        Žádné objednávky neodpovídají filtru.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3 font-semibold">External ID</th>
            <th className="px-4 py-3 font-semibold">Klient</th>
            <th className="px-4 py-3 font-semibold">QR kód</th>
            <th className="px-4 py-3 font-semibold">Vytvořeno</th>
            <th className="px-4 py-3 font-semibold">Label vytištěn</th>
            <th className="px-4 py-3 text-center font-semibold">Gravír</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const allDone = o.total > 0 && o.done === o.total;
            return (
              <tr
                key={o.order_id}
                onClick={() => router.push(`/order/${o.order_id}`)}
                className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {o.external_id ?? o.order_id}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                  {o.client_name ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.print_code}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {formatShort(o.order_created_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {formatShort(o.package_created_at)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.total === 0
                        ? "bg-slate-100 text-slate-400"
                        : allDone
                          ? "bg-[var(--ok-soft)] text-[var(--ok-ink)]"
                          : "bg-[var(--wait-soft)] text-[var(--wait-ink)]"
                    }`}
                  >
                    {o.done}/{o.total}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
