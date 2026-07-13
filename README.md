# Gravír konzole

Webová appka nahrazující Google Sheet + Make workflow pro gravírování na Vídeňské.
Operátor naskenuje QR balíčku → uvidí, co gravírovat a jakým textem → stáhne DXF →
odklikne „vygravírováno". Data tečou z produkční MySQL (read-only) do Supabase.

## Architektura

```
Produkce (MySQL, RO) ──feed.py──▶ Supabase Postgres (schema gravir_app)
Vláďa: zip s DXF ─────import_batch.py──▶ Supabase Storage (bucket dxf) + pairings
                                              │
                                       Next.js (Vercel) ── scan → detail → download → potvrzení
```

- **Párování na DXF:** `(EAN + normalizovaný text) → cislo → PT_<davka>_gravir_<cislo>.dxf`.
  Přesná shoda = `exact`, fallback jen dle EANu = `ean`, jinak `none`.
- Do produkce se **nikdy nezapisuje**. Stav gravíru se drží jen v Supabase.

## Přístup k Supabase

- **DB (Next + Python):** přímé Postgres spojení přes `SUPABASE_DB_URL`.
  ⚠ Použij **Session/Transaction pooler** string (host `…pooler.supabase.com`),
  NE „Direct connection" (`db.<ref>.supabase.co`) – ten je jen IPv6 a z běžné
  sítě se nepřeloží.
- **Storage (DXF):** REST se `SUPABASE_SERVICE_KEY`.

`.env` používá: `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
`SUPABASE_SCHEMA=gravir_app`.

## Setup (jednorázový backlog – aktuální režim)

Kolega dodá jeden zip (`WD gravir.zip`): složka `DXF/` s názvy
`<cislo>_<external_id>_<ean>_<text>.dxf` + `waterdrop_gravir_OK.xlsx`
se sloupci `order_id, external_id, ean, ikona_jmeno, DXF`.

```bash
cd scripts
python apply_migration.py                 # tabulky + Storage bucket
python import_wd.py "../WD gravir.zip"    # nahraje 6153 DXF (waterdrop/<cislo>.dxf) + pairings s order_id
python feed.py --backlog                  # nasyncuje přesně backlogové objednávky s QR (reset + 100% párování přes order_id)
```

Párování objednávka → DXF: **order_id + ean + text** (jednoznačné), fallback
`ean+text` → `ean`. Staré názvy `PT_..._gravir_<cislo>.dxf` bez order_id umí
`import_batch.py` (starší formát).

## Setup (průběžný sync – pro pozdější cron)

```bash
python feed.py            # balíky od půlnoci včerejška (jako starý Make)
python feed.py --days 14  # delší okno
```

## Vývoj

```bash
npm run dev        # http://localhost:3000
```

## Provoz

- `feed.py` pouštět periodicky (cron / Vercel Cron / GitHub Action) – default `python feed.py`
  bere balíky od půlnoci včerejška, stejně jako starý Make scénář.
- Novou dávku od Vládi nahraješ přes `import_batch.py <zip>`.
