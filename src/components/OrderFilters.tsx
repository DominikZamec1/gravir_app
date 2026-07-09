import Link from "next/link";

export interface FilterValues {
  ext?: string;
  cf?: string;
  ct?: string;
  lf?: string;
  lt?: string;
}

const inputCls =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-[var(--brand)] focus:ring-2";
const labelCls = "mb-1 block text-xs font-medium text-slate-400";

export default function OrderFilters({ values }: { values: FilterValues }) {
  const hasFilter = Boolean(values.ext || values.cf || values.ct || values.lf || values.lt);

  return (
    <form method="get" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 lg:col-span-2">
          <label className={labelCls}>External ID</label>
          <input
            name="ext"
            defaultValue={values.ext ?? ""}
            placeholder="např. DA5247157"
            className={`w-full ${inputCls}`}
          />
        </div>
        <div>
          <label className={labelCls}>Vytvořeno od</label>
          <input type="date" name="cf" defaultValue={values.cf ?? ""} className={`w-full ${inputCls}`} />
        </div>
        <div>
          <label className={labelCls}>Vytvořeno do</label>
          <input type="date" name="ct" defaultValue={values.ct ?? ""} className={`w-full ${inputCls}`} />
        </div>
        <div>
          <label className={labelCls}>Label od</label>
          <input type="date" name="lf" defaultValue={values.lf ?? ""} className={`w-full ${inputCls}`} />
        </div>
        <div>
          <label className={labelCls}>Label do</label>
          <input type="date" name="lt" defaultValue={values.lt ?? ""} className={`w-full ${inputCls}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Filtrovat
        </button>
        {hasFilter && (
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
            Zrušit filtr
          </Link>
        )}
      </div>
    </form>
  );
}
