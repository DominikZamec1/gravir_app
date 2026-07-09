"""
Import Vládiho párovací tabulky (xlsx) do normalizovaného indexu.

Struktura xlsx:
  řádek 1: název dávky ("17561_D2C data 9")
  řádek 2: hlavička (EAN | Jméno | Číslo)
  řádek 3+: data

Výstup: seznam pairing záznamů + kontroly (duplicity, chybějící čísla).
Klíč pro párování s objednávkou:  (ean, text_key)  kde text_key = normalize_text(jmeno)
DXF soubor:  PT_<davka>_gravir_<cislo>.dxf
"""

import sys
from collections import Counter, defaultdict

import openpyxl

from engraving import normalize_text


def load_pairings(xlsx_path: str):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    davka = (rows[0][0] or "").strip() if rows else ""
    records = []
    for r in rows[2:]:
        ean, jmeno, cislo = (r + (None, None, None))[:3]
        if ean is None and jmeno is None and cislo is None:
            continue
        records.append(
            {
                "davka": davka,
                "cislo": int(cislo) if cislo is not None else None,
                "ean": str(ean).strip() if ean is not None else None,
                "text": (str(jmeno).strip() if jmeno is not None else ""),
                "text_key": normalize_text(jmeno),
                "filename": f"PT_{davka}_gravir_{int(cislo)}.dxf" if cislo is not None else None,
            }
        )
    return davka, records


def build_index(records):
    """(ean, text_key) -> [cislo, ...]  (list, protože design může být duplicitní)"""
    idx = defaultdict(list)
    for r in records:
        idx[(r["ean"], r["text_key"])].append(r["cislo"])
    return idx


def report(xlsx_path: str):
    davka, records = load_pairings(xlsx_path)
    print(f"Dávka: {davka}")
    print(f"Záznamů: {len(records)}")

    cisla = sorted(r["cislo"] for r in records if r["cislo"] is not None)
    if cisla:
        missing = sorted(set(range(min(cisla), max(cisla) + 1)) - set(cisla))
        print(f"Čísla: {min(cisla)}–{max(cisla)}, chybí: {missing or 'žádné'}")

    eans = Counter(r["ean"] for r in records)
    print(f"Unikátních EANů: {len(eans)}")

    idx = build_index(records)
    dups = {k: v for k, v in idx.items() if len(v) > 1}
    print(f"Duplicitní páry (ean, text) -> více souborů: {len(dups)}")
    for (ean, key), cs in list(dups.items())[:10]:
        print(f"   ({ean}, {key!r}) -> čísla {sorted(cs)}")

    return davka, records, idx


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "../17561_D2C data 9.xlsx"
    report(path)
