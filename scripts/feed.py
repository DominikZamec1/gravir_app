"""
feed.py – sync produkční MySQL -> Supabase (přímé Postgres spojení). Read-only vůči produkci.

Dva režimy:
  --backlog   jednorázově: syncne přesně objednávky z DXF backlogu (order_id z pairings),
              které už mají QR (print_code). Před tím smaže staré objednávky.
  (default)   průběžně: objednávky připravené na gravír od půlnoci včerejška
              (--days N pro delší okno) – pro případný pozdější cron.

Použití:
  python feed.py --backlog
  python feed.py            # denní režim
  python feed.py --days 14
"""

import sys
from datetime import datetime, timezone

from common import db, prod_db
from engraving import parse_instruction
from matching import rematch

TAGS = ("__engraving", "engraving_videnska")

SELECT_COLS = """
  MAX(ot.name)      AS tag,
  o.order_status_id AS status,
  o.external_id     AS external_id,
  o.created_at      AS order_created_unix,
  MAX(p.created_at) AS pkg_created_unix,
  MAX(p.print_code) AS print_code,
  MAX(t.message)    AS message,
  c.name            AS klient
"""


def fetch_orders_by_days(days: int):
    sql = f"""
      SELECT ot.order_id, {SELECT_COLS}
      FROM order_tag ot
      JOIN `order` o ON o.id = ot.order_id
      JOIN shop s ON s.id = o.shop_id
      JOIN company c ON c.id = s.company_id
      JOIN packaging_instruction t ON t.order_id = ot.order_id
      JOIN package p ON p.order_id = ot.order_id
      WHERE ot.name IN (%s, %s) AND o.shop_id = 42
        AND p.created_at >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL %s DAY))
        AND p.print_code IS NOT NULL AND p.print_code <> ''
      GROUP BY ot.order_id, o.order_status_id, o.external_id, o.created_at, c.name
    """
    conn = prod_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (TAGS[0], TAGS[1], days))
            return cur.fetchall()
    finally:
        conn.close()


def fetch_orders_by_ids(order_ids):
    # Backlog: bereme VŠECHNY objednávky z DXF setu (i ty bez QR / status received).
    # package je LEFT JOIN – print_code může být null (nenaskenovatelné, ale zobrazené).
    ph = ",".join(["%s"] * len(order_ids))
    sql = f"""
      SELECT o.id AS order_id, {SELECT_COLS}
      FROM `order` o
      JOIN shop s ON s.id = o.shop_id
      JOIN company c ON c.id = s.company_id
      JOIN packaging_instruction t ON t.order_id = o.id
      LEFT JOIN package p ON p.order_id = o.id
      LEFT JOIN order_tag ot ON ot.order_id = o.id AND ot.name IN (%s, %s)
      WHERE o.shop_id = 42 AND o.id IN ({ph})
      GROUP BY o.id, o.order_status_id, o.external_id, o.created_at, c.name
    """
    conn = prod_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (TAGS[0], TAGS[1], *order_ids))
            return cur.fetchall()
    finally:
        conn.close()


def ts(unix):
    return datetime.fromtimestamp(int(unix), tz=timezone.utc) if unix is not None else None


ORDER_SQL = """
  insert into orders
    (order_id, external_id, tag, status, print_code, client_name,
     order_created_at, package_created_at, message, synced_at)
  values (%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
  on conflict (order_id) do update set
    external_id=excluded.external_id, tag=excluded.tag, status=excluded.status,
    print_code=excluded.print_code, client_name=excluded.client_name,
    order_created_at=excluded.order_created_at, package_created_at=excluded.package_created_at,
    message=excluded.message, synced_at=now()
"""
ITEM_SQL = """
  insert into engraving_items
    (order_id, line_index, qty, ean, text, text_key, engraved, engraved_at, engraved_by)
  values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""


def _sync_once(rows, reset):
    """Jeden pokus. VŠE (reset delete + upsert + insert) v JEDNÉ transakci –
    když cokoli selže, transakce se vrátí zpět a stará data zůstanou (žádné
    prázdné DB jako při ztrátě spojení)."""
    conn = db()
    try:
        with conn.cursor() as cur:
            order_ids = [r["order_id"] for r in rows]

            if reset:
                cur.execute("delete from orders")  # cascade smaže engraving_items (NE engraving_log)

            cur.executemany(ORDER_SQL, [
                (r["order_id"], r["external_id"], r["tag"], r["status"], r["print_code"], r["klient"],
                 ts(r["order_created_unix"]), ts(r["pkg_created_unix"]), r["message"]) for r in rows
            ])

            cur.execute("delete from engraving_items where order_id = any(%s)", (order_ids,))
            items = []
            for r in rows:
                for idx, l in enumerate(l for l in parse_instruction(r["message"]) if l.get("parsed")):
                    # engraved se nastaví z durabilního logu (níže), ne odsud
                    items.append((r["order_id"], idx, l["qty"], l["ean"], l["text"], l["text_key"],
                                  False, None, None))
            cur.executemany(ITEM_SQL, items)

            # obnovit "vygravírováno" z durabilního append-only logu (nejnovější akce)
            cur.execute("""
                update engraving_items i set
                  engraved = true, engraved_at = l.at, engraved_by = l.engraved_by
                from (
                  select distinct on (order_id, line_index)
                         order_id, line_index, action, at, engraved_by
                  from engraving_log
                  order by order_id, line_index, at desc
                ) l
                where l.order_id = i.order_id and l.line_index = i.line_index
                  and l.action = 'done'
            """)
            restored = cur.rowcount
        conn.commit()  # atomický commit celého syncu
        print(f"  objednávek: {len(rows)}, položek: {len(items)}, obnoveno z logu: {restored}")
        print("Přepočítávám napárování…")
        rematch(conn)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def sync(rows, reset):
    import time
    import psycopg

    # Guard: při resetu NIKDY nemazat, když z produkce nepřišla data
    # (jinak by prázdná odpověď smazala celou DB).
    if reset and not rows:
        print("  VAROVÁNÍ: z produkce 0 objednávek – reset zrušen, data ponechána.")
        return

    for attempt in range(1, 4):
        try:
            _sync_once(rows, reset)
            return
        except (psycopg.OperationalError, psycopg.InterfaceError) as ex:
            print(f"  pokus {attempt}/3 selhal (spojení): {repr(ex)[:120]}")
            if attempt == 3:
                raise
            time.sleep(5)


def main():
    if "--backlog" in sys.argv:
        conn = db()
        with conn.cursor() as cur:
            cur.execute("select distinct order_id from pairings where order_id is not null")
            ids = [r[0] for r in cur.fetchall()]
        conn.close()
        print(f"Backlog režim: {len(ids)} order_id z pairings")
        rows = fetch_orders_by_ids(ids)
        with_qr = sum(1 for r in rows if r["print_code"])
        print(f"  v produkci: {len(rows)} (z toho s QR: {with_qr})")
        sync(rows, reset=True)
    else:
        days = int(sys.argv[sys.argv.index("--days") + 1]) if "--days" in sys.argv else 1
        print(f"Denní režim: balíky za posledních {days} dní")
        rows = fetch_orders_by_days(days)
        sync(rows, reset=False)
    print("Feed hotový.")


if __name__ == "__main__":
    main()
