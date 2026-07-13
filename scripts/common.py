"""Sdílené utility pro Python skripty (env, DB, Supabase Storage)."""

import os
import sys
import io
import urllib.request
import urllib.error
import urllib.parse

# vždy UTF-8 výstup (Windows konzole)
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(fn=None):
    fn = fn or os.path.join(PROJECT_ROOT, ".env")
    d = {}
    with open(fn, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"').strip("'")
    # ať jsou i v os.environ (kvůli psycopg apod.)
    for k, v in d.items():
        os.environ.setdefault(k, v)
    return d


_ENV = None


def env():
    global _ENV
    if _ENV is None:
        _ENV = load_env()
    return _ENV


def schema_name():
    return env().get("SUPABASE_SCHEMA", "gravir_app")


def db():
    """Přímé spojení na Supabase Postgres přes SUPABASE_DB_URL."""
    import psycopg

    e = env()
    url = e.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Chybí SUPABASE_DB_URL v .env (Supabase → Settings → Database → Connection string, URI).")
    conn = psycopg.connect(url, autocommit=False)
    with conn.cursor() as cur:
        cur.execute(f"set search_path to {schema_name()}, public")
    conn.commit()
    return conn


def prod_db():
    """Read-only spojení na produkční MySQL."""
    import pymysql

    e = env()
    return pymysql.connect(
        host=e["PROD_DB_HOST"],
        port=int(e["PROD_DB_PORT"]),
        user=e["PROD_DB_USER"],
        password=e["PROD_DB_PASSWORD"],
        database=e["PROD_DB_DATABASE"],
        connect_timeout=15,
        read_timeout=120,
        ssl={"ssl": {}},
        cursorclass=pymysql.cursors.DictCursor,
    )


# ---- Supabase Storage (REST, service_role klíč) --------------------------
BUCKET = "dxf"


def _storage_headers(extra=None):
    e = env()
    key = e["SUPABASE_SERVICE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if extra:
        h.update(extra)
    return h


def ensure_bucket(public=True):
    """Vytvoří public bucket 'dxf', pokud neexistuje."""
    e = env()
    url = f"{e['SUPABASE_URL']}/storage/v1/bucket"
    import json

    body = json.dumps({"id": BUCKET, "name": BUCKET, "public": public}).encode()
    req = urllib.request.Request(
        url, data=body, headers=_storage_headers({"Content-Type": "application/json"}), method="POST"
    )
    try:
        urllib.request.urlopen(req, timeout=20)
        print(f"  bucket '{BUCKET}' vytvořen")
    except urllib.error.HTTPError as ex:
        msg = ex.read().decode(errors="replace")
        if ex.code == 400 and ("already exists" in msg or "Duplicate" in msg):
            print(f"  bucket '{BUCKET}' už existuje")
        else:
            raise


def upload_file(storage_path: str, data: bytes, content_type="application/dxf", upsert=True,
                retries=5):
    import time

    e = env()
    # cesta může obsahovat mezery / diakritiku -> percent-enkódovat (segmenty, / zachovat)
    quoted = urllib.parse.quote(storage_path, safe="/")
    url = f"{e['SUPABASE_URL']}/storage/v1/object/{BUCKET}/{quoted}"
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                data=data,
                headers=_storage_headers(
                    {"Content-Type": content_type, "x-upsert": "true" if upsert else "false"}
                ),
                method="POST",
            )
            urllib.request.urlopen(req, timeout=120)
            return
        except (urllib.error.URLError, TimeoutError, OSError) as ex:
            # HTTP 4xx (kromě 429) nemá smysl opakovat
            if isinstance(ex, urllib.error.HTTPError) and ex.code < 500 and ex.code != 429:
                raise
            last = ex
            time.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"upload selhal po {retries} pokusech: {storage_path} ({last!r})")
