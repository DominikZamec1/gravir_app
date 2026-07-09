"""
Sdílená logika pro gravírovací workflow.

Dvě klíčové věci:
1) parse_instruction() – rozparsuje 'Engraving:' text z packaging_instruction na jednotlivé řádky
2) normalize_text() – sjednotí text tak, aby (EAN + text) z objednávky sedl na (ean, jmeno) z Vládiho excelu

Párování na DXF soubor:  (EAN, normalizovaný text)  ->  cislo  ->  PT_<davka>_gravir_<cislo>.dxf
"""

import re
import unicodedata

# Řádek instrukce: "<ks> x <EAN>, <text>"
#   ks   = množství (celé číslo)
#   EAN  = 8–14 číslic
#   text = zbytek (gravírovaný text, může obsahovat emoji placeholdery {rocket} apod.)
_LINE_RE = re.compile(
    r"""^\s*
        (?P<qty>\d+)      \s* [x×]      \s*   # "1 x"
        (?P<ean>\d{8,14})                     # EAN
        \s*,\s*
        (?P<text>.*?)                         # gravírovaný text
        \s*$""",
    re.VERBOSE,
)

# V produkci je před "Engraving:" ještě vícejazyčné upozornění
# ("nedávat na pás – předej adminovi ..."). Marker proto hledáme kdekoli
# a bereme text od něj do konce (jako REGEXEXTRACT("Engraving:.*") v Google Sheetu).
_ENGRAVING_MARKER_RE = re.compile(r"engraving\s*:\s*(.*)$", re.IGNORECASE | re.DOTALL)


def parse_instruction(raw: str) -> list[dict]:
    """
    Vstup:  "...upozornění...\nEngraving: 1 x 9120128131187, {sparkles} 3646 || 1 x 9120128131187, {rocket} Sandra"
    Výstup: [
        {"qty": 1, "ean": "9120128131187", "text": "{sparkles} 3646", "text_key": "3646"},
        {"qty": 1, "ean": "9120128131187", "text": "{rocket} Sandra", "text_key": "sandra"},
    ]

    Vrací i řádky, které se nepodařilo naparsovat (parsed=False) – ať je vidět, co uteklo,
    a nic se tiše nezahodí.
    """
    if not raw:
        return []

    m = _ENGRAVING_MARKER_RE.search(raw)
    if not m:
        return []
    body = m.group(1).strip()
    out: list[dict] = []
    for chunk in body.split("||"):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = _LINE_RE.match(chunk)
        if not m:
            out.append({"raw": chunk, "parsed": False})
            continue
        text = m.group("text").strip()
        out.append(
            {
                "qty": int(m.group("qty")),
                "ean": m.group("ean"),
                "text": text,
                "text_key": normalize_text(text),
                "parsed": True,
            }
        )
    return out


def normalize_text(s: str) -> str:
    """
    Normalizace textu pro párování. Cíl: aby "Mamã Márcia", "MAMA MARCIA", " mama  marcia "
    daly stejný klíč a aby emoji placeholdery ({rocket}) párování nerozbily.

    Kroky:
      - odstraní emoji placeholdery typu {rocket}, {sparkles}
      - unicode NFKD + zahodí diakritiku (á->a, ü->u, ã->a)
      - lower, sjednotí bílé znaky na jednu mezeru
    """
    if s is None:
        return ""
    s = str(s)
    s = re.sub(r"\{[^}]*\}", " ", s)                      # {rocket} -> mezera
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ---- rychlý self-test na reálných příkladech z chatu ------------------------
if __name__ == "__main__":
    samples = [
        "Engraving: 1 x 9120128131194, Audri",
        "Engraving: 1 x 9120128131187, {sparkles} 3646 || 1 x 9120128131187, {rocket} Sandra",
    ]
    for s in samples:
        print("IN :", s)
        for line in parse_instruction(s):
            print("   ->", line)
        print()

    checks = [
        ("Mamã Márcia", "mama marcia"),
        ("{rocket} Sandra", "sandra"),
        ("  Nur   für  Mama ", "nur fur mama"),
        ("Gänseblümchen", "gansebluemchen".replace("ue", "u")),  # ü -> u
    ]
    print("normalize_text:")
    for raw, _exp in checks:
        print(f"   {raw!r:24} -> {normalize_text(raw)!r}")
