-- =====================================================================
--  Durabilní append-only log dokončených gravírů.
--  ZÁMĚRNĚ bez FK na orders/engraving_items a bez cascade – přežije reset
--  i případný wipe hlavních tabulek. Feed z něj obnovuje stav "engraved".
--  Identita položky napříč re-syncy: (order_id, line_index).
-- =====================================================================

create table if not exists gravir_app.engraving_log (
    id           bigint generated always as identity primary key,
    order_id     bigint not null,
    line_index   int    not null,
    ean          text,
    text         text,
    qty          int    not null default 1,
    action       text   not null default 'done',   -- done | undone
    engraved_by  text,
    at           timestamptz not null default now()
);

-- nejnovější akce pro danou položku
create index if not exists engraving_log_item_idx
    on gravir_app.engraving_log (order_id, line_index, at desc);

alter table gravir_app.engraving_log enable row level security;
