import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/queries";
import { statusLabel, formatDateTime, dxfUrl } from "@/lib/format";
import ItemCard from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const id = Number(orderId);
  if (!Number.isFinite(id)) notFound();

  const order = await getOrderDetail(id);
  if (!order) notFound();

  const total = order.items.length;
  const done = order.items.filter((i) => i.engraved).length;
  const allDone = total > 0 && done === total;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-slate-300 hover:text-white">
        ← Zpět na skenování
      </Link>

      <section className="rounded-3xl bg-white p-6 shadow-2xl shadow-black/20 ring-1 ring-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">Objednávka</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {order.external_id ?? order.order_id}
            </h1>
            <p className="mt-1 text-lg text-slate-600">{order.client_name ?? "—"}</p>
          </div>
          <div
            className={`rounded-2xl px-4 py-3 text-center ${
              allDone ? "bg-[var(--ok-soft)]" : "bg-[var(--wait-soft)]"
            }`}
          >
            <div
              className={`text-3xl font-black ${
                allDone ? "text-[var(--ok-ink)]" : "text-[var(--wait-ink)]"
              }`}
            >
              {done}/{total}
            </div>
            <div className={`text-xs font-semibold ${allDone ? "text-[var(--ok-ink)]" : "text-[var(--wait-ink)]"}`}>
              {allDone ? "hotovo" : "vygravírováno"}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Meta label="QR kód" value={order.print_code} mono />
          <Meta label="Stav" value={statusLabel(order.status)} />
          <Meta label="Služba" value={order.tag ?? "—"} />
          <Meta label="Balík vytvořen" value={formatDateTime(order.package_created_at)} />
        </dl>

        {order.message && (
          <div className="mt-6">
            <p className="mb-1.5 text-xs font-medium text-slate-400">
              Packaging instrukce (nestrojově, pro kontrolu)
            </p>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
              {order.message}
            </pre>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Ke gravírování ({total})
        </h2>
        {order.items.length === 0 && (
          <p className="rounded-2xl bg-white/80 p-6 text-center text-slate-500">
            Žádné gravírovací položky (nepodařilo se rozparsovat instrukci).
          </p>
        )}
        {order.items.map((item) => (
          <ItemCard key={item.id} item={item} dxfHref={dxfUrl(item.matched_storage_path)} />
        ))}
      </section>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className={`mt-0.5 font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
