-- =====================================================================
--  Gravír appka – schema gravir_app
--  Veškerý přístup jde přes service_role klíč ze serveru (Next server
--  actions + Python feed), takže RLS necháváme zapnuté bez policies –
--  service_role RLS obchází a zákaznická data (jména, adresy) se nikdy
--  neexponují anon klíčem.
-- =====================================================================

create schema if not exists gravir_app;

-- Dávky DXF od Vládi (párovací tabulka + soubory) --------------------
create table if not exists gravir_app.batches (
    name         text primary key,             -- "17561_D2C data 9"
    source_file  text,                          -- původní xlsx
    dxf_count    int  not null default 0,
    created_at   timestamptz not null default now()
);

-- Řádky párovací tabulky: (ean, text) -> cislo -> DXF soubor ----------
create table if not exists gravir_app.pairings (
    id            bigint generated always as identity primary key,
    batch_name    text not null references gravir_app.batches(name) on delete cascade,
    cislo         int  not null,                -- pořadí v dávce = přípona souboru
    ean           text not null,
    text          text not null,               -- původní jméno/gravírovaný text
    text_key      text not null,               -- normalizovaný text pro párování
    filename      text not null,               -- PT_<davka>_gravir_<cislo>.dxf
    storage_path  text not null,               -- cesta v bucketu dxf: <davka>/<filename>
    unique (batch_name, cislo)
);
create index if not exists pairings_match_idx on gravir_app.pairings (ean, text_key);

-- Objednávky nasyncované z produkce (jen ty s QR = ready na gravír) ---
create table if not exists gravir_app.orders (
    order_id            bigint primary key,
    external_id         text,
    tag                 text,                   -- __engraving | engraving_videnska
    status              text,                   -- label_printed, ...
    print_code          text not null,          -- QR kód balíčku
    client_name         text,
    order_created_at    timestamptz,
    package_created_at  timestamptz,
    message             text,                   -- celý packaging_instruction.message
    synced_at           timestamptz not null default now()
);
create index if not exists orders_print_code_idx on gravir_app.orders (print_code);
create index if not exists orders_pkg_created_idx on gravir_app.orders (package_created_at desc);

-- Jednotlivé gravírovací položky (rozparsované z message) -------------
create table if not exists gravir_app.engraving_items (
    id                 bigint generated always as identity primary key,
    order_id           bigint not null references gravir_app.orders(order_id) on delete cascade,
    line_index         int    not null,         -- pořadí v instrukci (0,1,2..)
    qty                int    not null default 1,
    ean                text,
    text               text,                    -- gravírovaný text vč. emoji ({rocket} Sandra)
    text_key           text,                    -- normalizovaný
    -- výsledek párování na DXF (počítá feed, ale UI umí dohledat i fallback):
    matched_batch      text,
    matched_cislo      int,
    matched_filename   text,
    matched_storage_path text,
    match_type         text not null default 'none',   -- exact | ean | none
    -- evidence gravíru (naše, do produkce se nezapisuje):
    engraved           boolean not null default false,
    engraved_at        timestamptz,
    engraved_by        text,
    unique (order_id, line_index)
);
create index if not exists items_order_idx on gravir_app.engraving_items (order_id);

-- RLS zapnuté bez policies: anon/public klíč nic nevidí, service_role (server
-- + feed) RLS obchází. Zákaznická data se tak nikdy nevystaví přes veřejný klíč.
alter table gravir_app.batches         enable row level security;
alter table gravir_app.pairings        enable row level security;
alter table gravir_app.orders          enable row level security;
alter table gravir_app.engraving_items enable row level security;
