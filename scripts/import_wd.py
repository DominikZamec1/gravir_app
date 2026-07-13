"""
Import jednorázového backlogu "WD gravir" od Vládi.

Struktura zipu:
  DXF/<cislo>_<external_id>_<ean>_<text>.dxf   (6153 souborů)
  waterdrop_gravir_OK.xlsx  se sloupci: order_id, external_id, ean, ikona_jmeno, DXF

Pořadí řádků v xlsx == číslo souboru (ověřeno). order_id bereme z xlsx.
DXF ukládáme do Storage pod čistým klíčem waterdrop/<cislo>.dxf (originální
názvy mají mezery/diakritiku/{emoji} -> vyhneme se problémům s enkódováním).

Použití:
  python import_wd.py "../WD gravir.zip"
"""

import io
import re
import sys
import zipfile
import threading
from concurrent.futures import ThreadPoolExecutor

import openpyxl

from common import db, ensure_bucket, upload_file
from engraving import normalize_text
from matching import rematch

BATCH = "waterdrop_gravir"
FILE_RE = re.compile(r"^(\d+)_([^_]+)_(\d{8,14})_(.+)\.dxf$")


def build_records(zip_path):
    z = zipfile.ZipFile(zip_path)
    names = [n for n in z.namelist() if not n.startswith("__MACOSX")]
    xlsx_name = next(n for n in names if n.lower().endswith(".xlsx"))

    # soubory podle čísla
    files = {}
    for n in names:
        if not n.lower().endswith(".dxf"):
            continue
        m = FILE_RE.match(n.split("/")[-1])
        if m:
            files[int(m.group(1))] = n  # cislo -> cesta v zipu

    wb = openpyxl.load_workbook(io.BytesIO(z.read(xlsx_name)), data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))[1:]  # bez hlavičky

    recs = []
    for i, r in enumerate(rows, start=1):
        order_id, external_id, ean, jmeno, _dxf = (list(r) + [None] * 5)[:5]
        if order_id is None:
            continue
        zip_name = files.get(i)
        if not zip_name:
            continue
        recs.append({
            "cislo": i,
            "order_id": int(order_id),
            "external_id": str(external_id).strip() if external_id else None,
            "ean": str(ean).strip(),
            "text": (str(jmeno).strip() if jmeno is not None else ""),
            "text_key": normalize_text(jmeno),
            "filename": zip_name.split("/")[-1],
            "storage_path": f"waterdrop/{i}.dxf",
            "zip_name": zip_name,
        })
    return z, xlsx_name, recs


def upload_all(zip_path, recs, workers=8):
    """Paralelní upload. Každé vlákno má vlastní ZipFile (ZipFile není thread-safe)."""
    local = threading.local()

    def get_zip():
        z = getattr(local, "z", None)
        if z is None:
            z = local.z = zipfile.ZipFile(zip_path)
        return z

    done = [0]
    lock = threading.Lock()

    def task(rec):
        data = get_zip().read(rec["zip_name"])
        upload_file(rec["storage_path"], data)
        with lock:
            done[0] += 1
            if done[0] % 250 == 0:
                print(f"  …nahráno {done[0]}/{len(recs)}")

    with ThreadPoolExecutor(max_workers=workers) as ex:
        list(ex.map(task, recs))
    print(f"  Storage: nahráno {done[0]}/{len(recs)}")


def main(zip_path):
    ensure_bucket(public=True)
    z, xlsx_name, recs = build_records(zip_path)
    print(f"Backlog: {len(recs)} položek | xlsx {xlsx_name.split('/')[-1]}")

    # 1) nahrát DXF
    upload_all(zip_path, recs)

    # 2) pairings do DB (čistý start – tohle je kanonický backlog)
    conn = db()
    with conn.cursor() as cur:
        cur.execute("delete from pairings")
        cur.execute("delete from batches")
        cur.execute(
            "insert into batches(name, source_file, dxf_count) values(%s,%s,%s)",
            (BATCH, xlsx_name.split("/")[-1], len(recs)),
        )
        cur.executemany(
            "insert into pairings(batch_name,cislo,order_id,external_id,ean,text,text_key,filename,storage_path) "
            "values(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            [(BATCH, r["cislo"], r["order_id"], r["external_id"], r["ean"], r["text"],
              r["text_key"], r["filename"], r["storage_path"]) for r in recs],
        )
    conn.commit()
    print(f"  DB: batch + {len(recs)} pairings zapsáno")

    print("Přepočítávám napárování…")
    rematch(conn)
    conn.close()
    print("Hotovo.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('Použití: python import_wd.py "../WD gravir.zip"')
    main(sys.argv[1])
