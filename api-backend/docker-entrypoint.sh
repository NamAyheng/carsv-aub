#!/bin/sh
set -e

echo "Waiting for database..."
python - <<'PY'
import os, sys, time
from urllib.parse import unquote, urlparse

database_url = (os.environ.get("DATABASE_URL") or "").strip()
engine = os.environ.get("DATABASE_ENGINE", "sqlite").strip().lower()
if not database_url and engine not in ("postgres", "postgresql", "pgsql"):
    sys.exit(0)

import psycopg

if database_url:
    parsed = urlparse(database_url)
    host = parsed.hostname or "127.0.0.1"
    port = int(parsed.port or 5432)
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    dbname = unquote((parsed.path or "").lstrip("/"))
else:
    host = os.environ.get("POSTGRES_HOST", "db")
    port = int(os.environ.get("POSTGRES_PORT", "5432"))
    user = os.environ.get("POSTGRES_USER", "carsv")
    password = os.environ.get("POSTGRES_PASSWORD", "carsv")
    dbname = os.environ.get("POSTGRES_DB", "carsv")

for attempt in range(60):
    try:
        with psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
            connect_timeout=3,
        ) as conn:
            conn.execute("SELECT 1")
        print(f"PostgreSQL ready at {host}:{port}/{dbname}")
        sys.exit(0)
    except Exception as exc:
        print(f"DB not ready ({attempt + 1}/60): {exc}")
        time.sleep(2)

print("PostgreSQL did not become ready in time", file=sys.stderr)
sys.exit(1)
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Optional one-shot admin bootstrap for Render Free (no shell). Never overwrites existing users.
python - <<'PY'
import os
import sys

email = (os.environ.get("DJANGO_SUPERUSER_EMAIL") or "").strip()
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or ""
username = (os.environ.get("DJANGO_SUPERUSER_USERNAME") or "").strip() or (email.split("@", 1)[0] if email else "")

if not email or not password or not username:
    sys.exit(0)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_backend.settings")
import django
django.setup()
from django.db.models import Q
from django_app.models import User

if User.objects.filter(Q(username__iexact=username) | Q(email__iexact=email)).exists():
    print("Superuser bootstrap skipped (user already exists).")
    sys.exit(0)

user = User.objects.create_superuser(username=username, email=email, password=password)
user.role = User.Role.ADMIN
user.status = User.Status.ACTIVE
user.email_verified = True
user.save(update_fields=["role", "status", "email_verified"])
print("Superuser bootstrap created.")
PY

# Opt-in catalog demo only. Never default-on. Idempotent; does not touch users/private data.
if [ "${DJANGO_SEED_DEMO:-0}" = "1" ]; then
  echo "DJANGO_SEED_DEMO=1 — running seed_catalog_demo..."
  python manage.py seed_catalog_demo
fi

exec "$@"
