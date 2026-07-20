import Link from "next/link";
import CompletedTable from "@/components/CompletedTable";
import { getCompletedEngravings } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type SP = { df?: string; dt?: string; page?: string };

export default async function HotovePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total, totalPieces } = await getCompletedEngravings({
    dateFrom: sp.df,
    dateTo: sp.dt,
    page,
    pageSize: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const params = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    if (sp.df) p.set("df", sp.df);
    if (sp.dt) p.set("dt", sp.dt);
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    return p.toString();
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams(params());
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/hotove?${s}` : "/hotove";
  };
  const exportHref = `/api/export/completed${params() ? `?${params()}` : ""}`;

  const inputCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-[var(--brand)] focus:ring-2";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hotové gravíry</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kusy označené v aplikaci jako vygravírované.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Hotových kusů" value={totalPieces} highlight />
          <Stat label="Záznamů" value={total} />
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Dokončeno od</label>
          <input type="date" name="df" defaultValue={sp.df ?? ""} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Dokončeno do</label>
          <input type="date" name="dt" defaultValue={sp.dt ?? ""} className={inputCls} />
        </div>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
          Filtrovat
        </button>
        {(sp.df || sp.dt) && (
          <Link href="/hotove" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
            Zrušit
          </Link>
        )}
        <a
          href={exportHref}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-indigo-50"
        >
          ⬇ Export CSV
        </a>
      </form>

      <CompletedTable rows={rows} />

      {pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <PagerLink href={pageHref(page - 1)} disabled={page <= 1}>← Předchozí</PagerLink>
          <span className="text-sm text-slate-400">
            {from}–{to} z {total} · strana {page}/{pages}
          </span>
          <PagerLink href={pageHref(page + 1)} disabled={page >= pages}>Další →</PagerLink>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-5 py-3 text-center ${highlight ? "bg-[var(--ok-soft)]" : "bg-white/10"}`}>
      <div className={`text-3xl font-black ${highlight ? "text-[var(--ok-ink)]" : "text-white"}`}>{value}</div>
      <div className={`text-xs font-semibold ${highlight ? "text-[var(--ok-ink)]" : "text-slate-300"}`}>{label}</div>
    </div>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600/40">{children}</span>;
  return (
    <Link href={href} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20">
      {children}
    </Link>
  );
}
