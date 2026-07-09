import "server-only";
import postgres from "postgres";

// Přímé Postgres spojení na Supabase (SUPABASE_DB_URL, session pooler URI).
// Používá se jen ze serveru (server komponenty + server actions).
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error("Chybí SUPABASE_DB_URL v .env");
}

const SCHEMA = process.env.SUPABASE_SCHEMA || "gravir_app";

declare global {
  // reuse spojení přes hot-reload v dev módu
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__sql ||
  postgres(connectionString, {
    max: 5,
    prepare: false, // funguje na session i transaction pooleru
    connection: { search_path: `${SCHEMA}, public` },
  });

if (process.env.NODE_ENV !== "production") global.__sql = sql;
