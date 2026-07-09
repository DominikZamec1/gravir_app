"""
Import jedné dávky DXF od Vládi (zip nebo složka):
  - nahraje DXF soubory do Supabase Storage (bucket dxf, cesta <davka>/<filename>)
  - naimportuje párovací tabulku (xlsx) do gravir_app.pairings
  - přepočítá napárování existujících objednávek

Použití:
  python import_batch.py "../PT_17561_D2C data 9_gravir.zip"
"""

import io
import re
import sys
import zipfile

import openpyxl

from common import db, ensure_bucket, upload_file
from engraving import normalize_text
from matching import rematch


def read_zip(path):
    z = zipfile.ZipFile(path)
    xlsx_name = next((n for n in z.namelist()
                      if n.lower().endswith(".xlsx") and not n.startswith("__MACOSX")), None)
    dxf_names = [n for n in z.namelist() if n.lower().endswith(".dxf")]
    if not xlsx_name:
        sys.exit("V zipu není xlsx párovací tabulka.")
    return z, xlsx_name, dxf_names


def load_pairings_from_bytes(xlsx_bytes):
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    davka = (str(rows[0][0]).strip() if rows and rows[0][0] else "")
    recs = []
    for r in rows[2:]:
        ean, jmeno, cislo = (tuple(r) + (None, None, None))[:3]
        if ean is None and jmeno is None and cislo is None:
            continue
        filename = f"PT_{davka}_gravir_{int(cislo)}.dxf"
        recs.append({
            "davka": davka,
            "cislo": int(cislo),
            "ean": str(ean).strip(),
            "text": (str(jmeno).strip() if jmeno is not None else ""),
            "text_key": normalize_text(jmeno),
            "filename": filename,
            "storage_path": f"{davka}/{filename}",
        })
    return davka, recs


def main(path):
    ensure_bucket(public=True)
    z, xlsx_name, dxf_names = read_zip(path)
    davka, recs = load_pairings_from_bytes(z.read(xlsx_name))
    print(f"Dávka: {davka} | pairings: {len(recs)} | DXF v zipu: {len(dxf_names)}")

    # 1) nahrát DXF do Storage
    by_base = {n.split("/")[-1]: n for n in dxf_names}
    uploaded = missing = 0
    for r in recs:
        zi = by_base.get(r["filename"])
        if not zi:
            missing += 1
            continue
        upload_file(r["storage_path"], z.read(zi))
        uploaded += 1
        if uploaded % 25 == 0:
            print(f"  …nahráno {uploaded}/{len(recs)}")
    print(f"  Storage: nahráno {uploaded}, chybí soubor {missing}")

    # 2) zapsat batch + pairings
    conn = db()
    with conn.cursor() as cur:
        cur.execute(
            "insert into batches(name, source_file, dxf_count) values(%s,%s,%s) "
            "on conflict (name) do update set source_file=excluded.source_file, dxf_count=excluded.dxf_count",
            (davka, xlsx_name.split("/")[-1], len(recs)),
        )
        cur.execute("delete from pairings where batch_name=%s", (davka,))
        cur.executemany(
            "insert into pairings(batch_name,cislo,ean,text,text_key,filename,storage_path) "
            "values(%s,%s,%s,%s,%s,%s,%s)",
            [(r["davka"], r["cislo"], r["ean"], r["text"], r["text_key"], r["filename"], r["storage_path"])
             for r in recs],
        )
    conn.commit()
    print(f"  DB: batch + {len(recs)} pairings zapsáno")

    # 3) přepočítat napárování objednávek
    print("Přepočítávám napárování…")
    rematch(conn)
    conn.close()
    print("Hotovo.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('Použití: python import_batch.py "cesta/k/PT_..._gravir.zip"')
    main(sys.argv[1])
