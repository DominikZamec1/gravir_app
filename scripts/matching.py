"""
Přepočítá napárování engraving_items -> pairings (DXF) v SQL.

Logika (klíč = ean + text):
  1) PŘESNÁ shoda: pairing se stejným ean i text_key  -> match_type='exact'
  2) fallback:     pairing se stejným ean (jiný text)  -> match_type='ean'
  3) jinak:        nespárováno                          -> match_type='none'

Duplicity (víc souborů pro stejný (ean,text)) řešíme nejnižším cislo – stejný design.
"""


def rematch(conn):
    with conn.cursor() as cur:
        cur.execute("""
            update engraving_items set
              matched_batch=null, matched_cislo=null, matched_filename=null,
              matched_storage_path=null, match_type='none'
        """)

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
        """)
        exact = cur.rowcount

        cur.execute("""
            update engraving_items i set
              matched_batch=p.batch_name, matched_cislo=p.cislo,
              matched_filename=p.filename, matched_storage_path=p.storage_path,
              match_type='ean'
            from (
              select distinct on (ean) ean, batch_name, cislo, filename, storage_path
              from pairings order by ean, cislo
            ) p
            where i.ean is not null and p.ean=i.ean and i.match_type <> 'exact'
        """)
        ean = cur.rowcount

        cur.execute("select count(*) from engraving_items where match_type='none'")
        none = cur.fetchone()[0]
    conn.commit()
    print(f"  napárováno: exact={exact}, ean={ean}, none={none}")
    return exact, ean, none
