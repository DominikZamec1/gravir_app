export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form
        action="/api/login"
        method="post"
        className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl shadow-black/20 ring-1 ring-black/5"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand)] text-lg font-black text-white">
            ⚙
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">Gravír konzole</span>
        </div>
        <label className="mb-1 block text-sm font-medium text-slate-500">Heslo</label>
        <input
          type="password"
          name="password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-[var(--brand)] focus:ring-2"
        />
        {e && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            Nesprávné heslo.
          </p>
        )}
        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-[var(--brand)] py-3 text-base font-semibold text-white shadow-lg shadow-indigo-900/30 transition active:scale-[0.99]"
        >
          Přihlásit
        </button>
      </form>
    </div>
  );
}
