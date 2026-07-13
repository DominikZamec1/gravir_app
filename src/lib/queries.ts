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

export type SortKey = "label" | "created";
export type SortDir = "asc" | "desc";

export interface OrderFilters {
  externalId?: string;
  createdFrom?: string; // YYYY-MM-DD
  createdTo?: string;
  labelFrom?: string;
  labelTo?: string;
  sort?: SortKey;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface OrderListItem {
  order_id: number;
  external_id: string | null;
  client_name: string | null;
  print_code: string | null;
  order_created_at: string | null;
  package_created_at: string | null;
  total: number;
  done: number;
}

/** Přehled objednávek s filtry + stránkováním. Vrací řádky pro stránku a celkový počet. */
export async function getOrders(
  f: OrderFilters = {},
): Promise<{ rows: OrderListItem[]; total: number }> {
  const ext = f.externalId?.trim();
  const pageSize = f.pageSize ?? 100;
  const page = Math.max(1, f.page ?? 1);
  const offset = (page - 1) * pageSize;

  // whitelist řazení (bezpečné – žádná interpolace uživatelského vstupu)
  const sortCol = f.sort === "created" ? sql`o.order_created_at` : sql`o.package_created_at`;
  const sortDir = f.dir === "asc" ? sql`asc` : sql`desc`;

  const rows = await sql<(OrderListItem & { total_count: number })[]>`
    select o.order_id, o.external_id, o.client_name, o.print_code,
           o.order_created_at, o.package_created_at,
           count(i.id)::int as total,
           count(i.id) filter (where i.engraved)::int as done,
           count(*) over()::int as total_count
    from orders o
    left join engraving_items i on i.order_id = o.order_id
    where (${ext ? sql`o.external_id ilike ${"%" + ext + "%"}` : sql`true`})
      and (${f.createdFrom ? sql`(o.order_created_at at time zone 'Europe/Prague')::date >= ${f.createdFrom}` : sql`true`})
      and (${f.createdTo ? sql`(o.order_created_at at time zone 'Europe/Prague')::date <= ${f.createdTo}` : sql`true`})
      and (${f.labelFrom ? sql`(o.package_created_at at time zone 'Europe/Prague')::date >= ${f.labelFrom}` : sql`true`})
      and (${f.labelTo ? sql`(o.package_created_at at time zone 'Europe/Prague')::date <= ${f.labelTo}` : sql`true`})
    group by o.order_id
    order by ${sortCol} ${sortDir} nulls last
    limit ${pageSize} offset ${offset}
  `;
  const total = rows.length ? rows[0].total_count : 0;
  return { rows, total };
}

export interface CompletedEngraving {
  id: number;
  order_id: number;
  qty: number;
  ean: string | null;
  text: string | null;
  matched_cislo: number | null;
  engraved_at: string | null;
  engraved_by: string | null;
  external_id: string | null;
  client_name: string | null;
  print_code: string | null;
}

/** Gravíry označené v appce jako hotové, nejnovější první (posledních `limit`). */
export async function getCompletedEngravings(limit = 500): Promise<CompletedEngraving[]> {
  return sql<CompletedEngraving[]>`
    select i.id, i.order_id, i.qty, i.ean, i.text, i.matched_cislo,
           i.engraved_at, i.engraved_by,
           o.external_id, o.client_name, o.print_code
    from engraving_items i
    join orders o on o.order_id = i.order_id
    where i.engraved = true
    order by i.engraved_at desc nulls last
    limit ${limit}
  `;
}
