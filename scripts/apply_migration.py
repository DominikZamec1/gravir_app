"""Aplikuje SQL migrace ze supabase/migrations/ (přímé Postgres spojení) a založí Storage bucket."""

import os
import glob

from common import db, ensure_bucket, PROJECT_ROOT


def main():
    mig_dir = os.path.join(PROJECT_ROOT, "supabase", "migrations")
    files = sorted(glob.glob(os.path.join(mig_dir, "*.sql")))
    if not files:
        print("Žádné migrace v", mig_dir)
        return

    conn = db()
    for path in files:
        with open(path, encoding="utf-8") as f:
            sql = f.read()
        print(f"→ {os.path.basename(path)}")
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    conn.close()
    print("Migrace hotové.")

    print("Storage:")
    ensure_bucket(public=True)
    print("Hotovo.")


if __name__ == "__main__":
    main()
