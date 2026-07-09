"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { findOrderIdByQR } from "@/lib/queries";

/** Scan formuláře: QR -> přesměruj na detail, nebo vrať zpět s chybou. */
export async function lookupByQR(formData: FormData): Promise<void> {
  const qr = String(formData.get("qr") ?? "").trim();
  if (!qr) redirect("/?e=empty");
  const orderId = await findOrderIdByQR(qr);
  if (!orderId) redirect(`/?e=notfound&qr=${encodeURIComponent(qr)}`);
  redirect(`/order/${orderId}`);
}

/** Přepnutí stavu "vygravírováno" u jedné položky. */
export async function setEngraved(
  itemId: number,
  orderId: number,
  engraved: boolean,
): Promise<void> {
  await sql`
    update engraving_items
    set engraved = ${engraved},
        engraved_at = ${engraved ? sql`now()` : null},
        engraved_by = ${engraved ? "operátor" : null}
    where id = ${itemId}
  `;
  revalidatePath(`/order/${orderId}`);
}
