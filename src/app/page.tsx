import Link from "next/link";
import ScanForm from "@/components/ScanForm";
import OrderFilters from "@/components/OrderFilters";
import OrdersTable from "@/components/OrdersTable";
import { getOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type SP = {
  e?: string; qr?: string;
  ext?: string; cf?: string; ct?: string; lf?: string; lt?: string;
  page?: string;
};

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await getOrders({
    externalId: sp.ext, createdFrom: sp.cf, createdTo: sp.ct,
    labelFrom: sp.lf, labelTo: sp.lt,
    page, pageSize: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  // querystring pro stránkovací odkazy (zachová filtry)
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (sp.ext) params.set("ext", sp.ext);
    if (sp.cf) params.set("cf", sp.cf);
    if (sp.ct) params.set("ct", sp.ct);
    if (sp.lf) params.set("lf", sp.lf);
    if (sp.lt) params.set("lt", sp.lt);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

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
          <span className="text-xs text-slate-400">
            {from}–{to} z {total}
          </span>
        </div>
        <OrderFilters values={{ ext: sp.ext, cf: sp.cf, ct: sp.ct, lf: sp.lf, lt: sp.lt }} />
        <OrdersTable orders={rows} />

        {pages > 1 && (
          <div className="mt-1 flex items-center justify-between px-1">
            <PagerLink href={qs(page - 1)} disabled={page <= 1}>
              ← Předchozí
            </PagerLink>
            <span className="text-sm text-slate-400">
              Stránka {page} z {pages}
            </span>
            <PagerLink href={qs(page + 1)} disabled={page >= pages}>
              Další →
            </PagerLink>
          </div>
        )}
      </section>
    </div>
  );
}

function PagerLink({
  href, disabled, children,
}: {
  href: string; disabled: boolean; children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600/40">{children}</span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
