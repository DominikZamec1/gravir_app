"""
Přepočítá napárování engraving_items -> pairings (DXF) v SQL.

Klíč je text (jméno) – ten určuje konkrétní gravír. order_id pomáhá vybrat
správný soubor mezi duplicitními návrhy (stejný ean+text u víc objednávek).

  1) order_id + ean + text_key  -> exact  (soubor přímo té objednávky)
  2) ean + text_key             -> exact  (shodný design z jiné objednávky – identický)
  3) ean                        -> ean    (jen typ lahve, text nesedí)
  4) jinak                      -> none
"""


def rematch(conn):
    with conn.cursor() as cur:
        cur.execute("""
            update engraving_items set
              matched_batch=null, matched_cislo=null, matched_filename=null,
              matched_storage_path=null, match_type='none'
        """)

        # 1) přímo objednávka: order_id + ean + text
        cur.execute("""
            update engraving_items i set
              matched_batch=p.batch_name, matched_cislo=p.cislo,
              matched_filename=p.filename, matched_storage_path=p.storage_path,
              match_type='exact'
            from (
              select distinct on (order_id, ean, text_key)
                     order_id, ean, text_key, batch_name, cislo, filename, storage_path
              from pairings where order_id is not null
              order by order_id, ean, text_key, cislo
            ) p
            where i.ean is not null and p.order_id=i.order_id
              and p.ean=i.ean and p.text_key=i.text_key
        """)
        by_order = cur.rowcount

        # 2) shodný design kdekoli: ean + text
        cur.execute("""
            update engraving_items i set
              matched_batch=p.batch_name, matched_cislo=p.cislo,
              matched_filename=p.filename, matched_storage_path=p.storage_path,
              match_type='exact'
            from (
              select distinct on (ean, text_key)
                     ean, text_key, batch_name, cislo, filename, storage_path
              from pairings order by ean, text_key, cislo
            ) p
            where i.ean is not null and p.ean=i.ean and p.text_key=i.text_key
              and i.match_type='none'
        """)
        by_text = cur.rowcount

        # 3) fallback jen dle EANu
        cur.execute("""
            update engraving_items i set
              matched_batch=p.batch_name, matched_cislo=p.cislo,
              matched_filename=p.filename, matched_storage_path=p.storage_path,
              match_type='ean'
            from (
              select distinct on (ean) ean, batch_name, cislo, filename, storage_path
              from pairings order by ean, cislo
            ) p
            where i.ean is not null and p.ean=i.ean and i.match_type='none'
        """)
        by_ean = cur.rowcount

        cur.execute("select count(*) from engraving_items where match_type='none'")
        none = cur.fetchone()[0]
    conn.commit()
    print(f"  napárováno: order_id={by_order}, text={by_text}, ean={by_ean}, none={none}")
    return by_order, by_text, by_ean, none
