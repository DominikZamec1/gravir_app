import type { NextRequest } from "next/server";
import { getCompletedForExport } from "@/lib/queries";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  }).format(d);
}

// CSV pole: obal do uvozovek, zdvoj vnitřní uvozovky
function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rows = await getCompletedForExport({
    dateFrom: sp.get("df") ?? undefined,
    dateTo: sp.get("dt") ?? undefined,
  });

  const header = ["Dokončeno", "Text", "Kusů", "EAN", "DXF", "External ID", "Order ID", "Klient", "Kdo"];
  const lines = [header.map(cell).join(";")];
  for (const r of rows) {
    lines.push([
      fmt(r.engraved_at), r.text, r.qty, r.ean, r.matched_cislo ? `#${r.matched_cislo}` : "",
      r.external_id, r.order_id, r.client_name, r.engraved_by,
    ].map(cell).join(";"));
  }
  // BOM kvůli diakritice v Excelu + koncový řádek
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hotove-graviry-${today}.csv"`,
    },
  });
}
