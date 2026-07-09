import CompletedTable from "@/components/CompletedTable";
import { getCompletedEngravings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HotovePage() {
  const rows = await getCompletedEngravings();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Hotové gravíry</h1>
        <span className="text-sm text-slate-400">{rows.length} položek</span>
      </div>
      <p className="px-1 text-sm text-slate-400">
        Jednotlivé kusy, které operátor v aplikaci označil jako vygravírované.
      </p>
      <CompletedTable rows={rows} />
    </div>
  );
}
