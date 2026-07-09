import ScanForm from "@/components/ScanForm";
import OrderFilters from "@/components/OrderFilters";
import OrdersTable from "@/components/OrdersTable";
import { getOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SP = { e?: string; qr?: string; ext?: string; cf?: string; ct?: string; lf?: string; lt?: string };

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  const orders = await getOrders({
    externalId: sp.ext,
    createdFrom: sp.cf,
    createdTo: sp.ct,
    labelFrom: sp.lf,
    labelTo: sp.lt,
  });

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
        {sp.e === "notfound" && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            QR kód <span className="font-mono">{sp.qr}</span> nebyl nalezen. Je balíček už připravený (štítek
            vytištěn) a nasyncovaný?
          </p>
        )}
        {sp.e === "empty" && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Nezadal jsi žádný kód.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Objednávky</h2>
          <span className="text-xs text-slate-400">{orders.length} zobrazeno</span>
        </div>
        <OrderFilters values={{ ext: sp.ext, cf: sp.cf, ct: sp.ct, lf: sp.lf, lt: sp.lt }} />
        <OrdersTable orders={orders} />
      </section>
    </div>
  );
}
