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

## Setup (jednou, lokálně)

```bash
cd scripts
python apply_migration.py                        # vytvoří Storage bucket + ověří tabulky
python import_batch.py "../PT_17561_D2C data 9_gravir.zip"   # nahraje DXF + pairings
python feed.py --days 14                          # nasyncuje objednávky z produkce
```

## Vývoj

```bash
npm run dev        # http://localhost:3000
```

## Provoz

- `feed.py` pouštět periodicky (cron / Vercel Cron / GitHub Action) – default `python feed.py`
  bere balíky od půlnoci včerejška, stejně jako starý Make scénář.
- Novou dávku od Vládi nahraješ přes `import_batch.py <zip>`.
