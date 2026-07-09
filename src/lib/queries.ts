import "server-only";
import { sql } from "./db";
import type { OrderDetail, OrderRow, ItemRow } from "./types";

/** Najde order_id podle QR (print_code). Bere nejnovější balík, kdyby jich bylo víc. */
export async function findOrderIdByQR(qr: string): Promise<number | null> {
  const code = qr.trim();
  if (!code) return null;
  const rows = await sql<{ order_id: number }[]>`
    select order_id
    from orders
    where print_code = ${code}
    order by package_created_at desc nulls last
    limit 1
  `;
  return rows.length ? rows[0].order_id : null;
}

export async function getOrderDetail(orderId: number): Promise<OrderDetail | null> {
  const orders = await sql<OrderRow[]>`
    select order_id, external_id, tag, status, print_code, client_name,
           order_created_at, package_created_at, message
    from orders
    where order_id = ${orderId}
    limit 1
  `;
  if (!orders.length) return null;

  const items = await sql<ItemRow[]>`
    select id, order_id, line_index, qty, ean, text, text_key,
           matched_batch, matched_cislo, matched_filename, matched_storage_path,
           match_type, engraved, engraved_at, engraved_by
    from engraving_items
    where order_id = ${orderId}
    order by line_index asc
  `;

  return { ...orders[0], items };
}

/** Přehled na home: poslední objednávky se stavem hotovo/celkem. */
export async function getRecentOrders(limit = 12) {
  return sql<
    {
      order_id: number;
      external_id: string | null;
      client_name: string | null;
      print_code: string;
      package_created_at: string | null;
      total: number;
      done: number;
    }[]
  >`
    select o.order_id, o.external_id, o.client_name, o.print_code, o.package_created_at,
           count(i.id)::int as total,
           count(i.id) filter (where i.engraved)::int as done
    from orders o
    left join engraving_items i on i.order_id = o.order_id
    group by o.order_id
    order by o.package_created_at desc nulls last
    limit ${limit}
  `;
}
