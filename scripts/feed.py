"""
feed.py – sync produkční MySQL -> Supabase (přímé Postgres spojení).

Tahá objednávky připravené na gravír (mají print_code = QR, štítek vytištěn) pro
obě služby (__engraving, engraving_videnska), shop 42. Rozparsuje instrukce na
položky, upsertne do gravir_app a přepočítá napárování na DXF.
Do produkce NIKDY nezapisuje (read-only).

Použití:
  python feed.py            # default: balíky od půlnoci včerejška (jako starý Make)
  python feed.py --days 14  # delší backfill (např. pro demo)
"""

import sys
from datetime import datetime, timezone

from common import db, prod_db
from engraving import parse_instruction
from matching import rematch

TAGS = ("__engraving", "engraving_videnska")


def fetch_orders(days: int):
    sql = """
      SELECT ot.order_id,
             MAX(ot.name)      AS tag,
             o.order_status_id AS status,
             o.external_id     AS external_id,
             o.created_at      AS order_created_unix,
             MAX(p.created_at) AS pkg_created_unix,
             MAX(p.print_code) AS print_code,
             MAX(t.message)    AS message,
             c.name            AS klient
      FROM order_tag ot
      JOIN `order` o ON o.id = ot.order_id
      JOIN shop s ON s.id = o.shop_id
      JOIN company c ON c.id = s.company_id
      JOIN packaging_instruction t ON t.order_id = ot.order_id
      JOIN package p ON p.order_id = ot.order_id
      WHERE ot.name IN (%s, %s)
        AND o.shop_id = 42
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


def ts(unix):
    if unix is None:
        return None
    return datetime.fromtimestamp(int(unix), tz=timezone.utc)


ORDER_SQL = """
  insert into orders
    (order_id, external_id, tag, status, print_code, client_name,
     order_created_at, package_created_at, message, synced_at)
  values (%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
  on conflict (order_id) do update set
    external_id=excluded.external_id, tag=excluded.tag, status=excluded.status,
    print_code=excluded.print_code, client_name=excluded.client_name,
    order_created_at=excluded.order_created_at,
    package_created_at=excluded.package_created_at,
    message=excluded.message, synced_at=now()
"""

ITEM_SQL = """
  insert into engraving_items
    (order_id, line_index, qty, ean, text, text_key, engraved, engraved_at, engraved_by)
  values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""


def main(days: int):
    print(f"Stahuji z produkce (posledních {days} dní)…")
    rows = fetch_orders(days)
    print(f"  objednávek: {len(rows)}")
    if not rows:
        return
    order_ids = [r["order_id"] for r in rows]

    conn = db()
    with conn.cursor() as cur:
        # zachovat stav "engraved" u položek, které už existují: (order_id, line_index)
        cur.execute("select order_id, line_index, engraved, engraved_at, engraved_by "
                    "from engraving_items where order_id = any(%s)", (order_ids,))
        prev = {(row[0], row[1]): row for row in cur.fetchall()}

        # 1) hromadný upsert objednávek
        cur.executemany(ORDER_SQL, [
            (r["order_id"], r["external_id"], r["tag"], r["status"], r["print_code"],
             r["klient"], ts(r["order_created_unix"]), ts(r["pkg_created_unix"]), r["message"])
            for r in rows
        ])

        # 2) položky: smazat staré (jedním dotazem) a vložit nově naparsované
        cur.execute("delete from engraving_items where order_id = any(%s)", (order_ids,))
        items = []
        for r in rows:
            lines = [l for l in parse_instruction(r["message"]) if l.get("parsed")]
            for idx, l in enumerate(lines):
                p = prev.get((r["order_id"], idx))
                items.append((r["order_id"], idx, l["qty"], l["ean"], l["text"], l["text_key"],
                              p[2] if p else False, p[3] if p else None, p[4] if p else None))
        cur.executemany(ITEM_SQL, items)
    conn.commit()
    print(f"  položek: {len(items)}")

    print("Přepočítávám napárování…")
    rematch(conn)
    conn.close()
    print("Feed hotový.")


if __name__ == "__main__":
    days = 1
    if "--days" in sys.argv:
        days = int(sys.argv[sys.argv.index("--days") + 1])
    main(days)
