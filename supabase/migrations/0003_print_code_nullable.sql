-- =====================================================================
--  Backlog obsahuje i objednávky, které ještě nemají QR (status received).
--  Chceme je v appce zobrazit taky (nenaskenují se, ale jsou dohledatelné
--  a mají DXF). Proto print_code smí být prázdný.
-- =====================================================================

alter table gravir_app.orders alter column print_code drop not null;
