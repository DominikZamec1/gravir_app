-- =====================================================================
--  Backlog s order_id: párovací tabulka od Vládi nově obsahuje order_id
--  a external_id přímo (soubor = <cislo>_<external_id>_<ean>_<text>.dxf).
--  Umožňuje jednoznačné párování objednávka -> DXF přes order_id.
-- =====================================================================

alter table gravir_app.pairings add column if not exists order_id    bigint;
alter table gravir_app.pairings add column if not exists external_id text;

create index if not exists pairings_order_idx on gravir_app.pairings (order_id, ean);
