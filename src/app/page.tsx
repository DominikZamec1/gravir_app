import Link from "next/link";
import ScanForm from "@/components/ScanForm";
import { getRecentOrders } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; qr?: string }>;
}) {
  const { e, qr } = await searchParams;
  const recent = await getRecentOrders(12);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-white/95 p-6 shadow-2xl shadow-black/20 ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Naskenuj balíček</h1>
        <p className="mt-1 text-slate-500">
          Přilož čtečku k QR kódu na balíčku. Objednávka se otevře automaticky.
        </p>
        <div className="mt-5">
          <ScanForm />
        </div>
        {e === "notfound" && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            QR kód <span className="font-mono">{qr}</span> nebyl nalezen. Je balíček už připravený (štítek
            vytištěn) a nasyncovaný?
          </p>
        )}
        {e === "empty" && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Nezadal jsi žádný kód.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Poslední objednávky
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.length === 0 && (
            <p className="col-span-full rounded-2xl bg-white/80 p-6 text-center text-slate-500">
              Zatím žádná data. Spusť feed (<span className="font-mono">scripts/feed.py</span>).
            </p>
          )}
          {recent.map((o) => {
            const allDone = o.total > 0 && o.done === o.total;
            return (
              <Link
                key={o.order_id}
                href={`/order/${o.order_id}`}
                className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{o.external_id ?? o.order_id}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      allDone
                        ? "bg-[var(--ok-soft)] text-[var(--ok-ink)]"
                        : "bg-[var(--wait-soft)] text-[var(--wait-ink)]"
                    }`}
                  >
                    {o.done}/{o.total}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">{o.client_name ?? "—"}</p>
                <p className="mt-2 font-mono text-xs text-slate-400">{o.print_code}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(o.package_created_at)}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
