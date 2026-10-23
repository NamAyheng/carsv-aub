# CarSV — Docker Compose (PostgreSQL)

Recommended way for teammates on **Windows (Docker Desktop)** and **Linux/Fedora (Docker Engine)** to run the full stack.

Your existing **SQLite** file `api-backend/db.sqlite3` is **not** used by Compose and is never deleted by these steps. Keep using it for the non-Docker workflow in `README.md`.

## Ports / name clash note

| Service | Container | Host port |
| --- | --- | --- |
| CarSV Postgres | `carsv-db` | `127.0.0.1:5433` |
| Your test Postgres (already running) | `postgres-db` | `127.0.0.1:5432` |

Compose does **not** replace or remove `postgres-db`.

## 1. One-time setup

```bash
cd carsv-aub
cp .env.example .env
# Edit .env — set DJANGO_SECRET_KEY and POSTGRES_PASSWORD at minimum
```

Optional: copy Google / Telegram values from `api-backend/.env` into the root `.env`.

For email verification links, set `FRONTEND_URL` (local: `http://127.0.0.1:3000`).  
Local default `EMAIL_BACKEND` is console (messages appear in `carsv-api` logs).  

For **Render** (free tier), see `RENDER.md`. Use Resend **HTTPS** (`django_app.email_backends.ResendAPIBackend`) — SMTP ports are blocked on Free Web Services.

## 2. Start (Fedora / Linux / Windows)

```bash
docker compose up --build
```

| App | URL |
| --- | --- |
| React | http://localhost:3000 |
| Django admin / API | http://localhost:8000/admin/ |

Stop with `Ctrl+C`, or in another terminal:

```bash
docker compose down
```

Data stays in Docker volumes (`carsv_pgdata`, `carsv_media`). To stop **without** removing volumes:

```bash
docker compose down
```

Do **not** run `docker compose down -v` unless you intend to wipe the Compose Postgres volume (ask first).

## 3. First empty database

Compose runs `migrate` on API start. Create a superuser when needed:

```bash
docker compose exec api python manage.py createsuperuser
```

Or seed (if your seed command fits the empty DB):

```bash
docker compose exec api python manage.py seed_users
```

## 4. Migrate existing SQLite data → Compose Postgres (safe)

**Do this only when you want your local SQLite data inside `carsv-db`.**

1. **Backup SQLite (copy only — do not rename/delete the original):**

```bash
cp api-backend/db.sqlite3 "api-backend/db.sqlite3.bak-before-pg-$(date +%Y%m%d)"
```

2. Start Compose so Postgres is up: `docker compose up -d db api`

3. Export from SQLite (host venv, default SQLite settings):

```bash
cd api-backend
source env/bin/activate   # Windows: .\env\Scripts\Activate.ps1
# Ensure DATABASE_ENGINE is unset or sqlite in api-backend/.env
python manage.py dumpdata --natural-foreign --natural-primary \
  -e contenttypes -e auth.Permission -e sessions \
  -o ../carsv-sqlite-dump.json
```

4. Load into Compose Postgres:

```bash
docker compose exec -T api python manage.py loaddata /app/../carsv-sqlite-dump.json
```

If the dump path is awkward inside the container, copy it in:

```bash
docker compose cp carsv-sqlite-dump.json api:/tmp/carsv-sqlite-dump.json
docker compose exec api python manage.py loaddata /tmp/carsv-sqlite-dump.json
```

If `loaddata` fails on conflicts, flush **only** the Compose database (never your SQLite file):

```bash
docker compose exec api python manage.py flush --noinput
docker compose exec api python manage.py loaddata /tmp/carsv-sqlite-dump.json
```

## 5. Non-Docker SQLite workflow (unchanged)

See `README.md`. Leave `DATABASE_ENGINE=sqlite` (or unset) in `api-backend/.env`.

To point the host Django at Compose Postgres instead:

```env
DATABASE_ENGINE=postgres
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5433
POSTGRES_DB=carsv
POSTGRES_USER=carsv
POSTGRES_PASSWORD=...
```

## 6. Production hosting (not enabled yet)

This Compose file is for **local/team development**. Live domain, DNS, HTTPS, and provider redirect URLs are **out of scope** until you authorize them. When ready, we will add a production profile (built React + Nginx + gunicorn, `DJANGO_DEBUG=0`).

## Render hosting

See [`RENDER.md`](RENDER.md) for Static Site + Web Service + Postgres free-tier setup. Local Compose is unchanged.

## Media files (images)

Compose binds `./api-backend` into the API container, so images under `api-backend/media/` are served at `/media/...`.

If images are missing after a fresh DB:

1. Keep files in `api-backend/media/` (do not delete that folder).
2. Restart API: `sudo docker compose up -d api`
3. Re-attach DB image fields if needed (seeded rows need `image` / `photo` paths set).

## Telegram on a new Postgres database

Telegram `chat_id` lived in SQLite. After switching to Compose Postgres, re-link or copy the chat id for the same customer email/phone. Alerts need:

- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` in root `.env`
- Customer row with `telegram_chat_id` + `telegram_alerts=true`

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Port 5433 in use | Change the left side of `127.0.0.1:5433:5432` in `docker-compose.yml` |
| Port 8000 / 3000 in use | Stop the local `runserver` / `npm run dev`, or change published ports |
| API cannot reach DB | Wait for healthcheck; `docker compose ps` should show `carsv-db` healthy |
| Frontend API 502 | Ensure `carsv-api` is up; Vite proxies to `http://api:8000` inside Compose |
| Static/admin CSS missing | `docker compose exec api python manage.py collectstatic --noinput` |
| Images 404 | Confirm `api-backend/media/` has files; recreate API so bind mount is used (`docker compose up -d api`) |
| Images point at `http://api:8000/...` | Restart API after pulling media URL fix: `sudo docker compose restart api` (site-relative `/media/...` URLs) |
| No Telegram alerts | Confirm customer `telegram_chat_id` on Postgres; bot token in `.env`; reopen Telegram / press Start if needed |

## Windows notes

- Install **Docker Desktop** and ensure it is running.
- Use PowerShell or WSL2; same `docker compose` commands.
- Line endings: repo includes `.gitattributes`; if scripts fail with `^M`, re-checkout or `git add --renormalize`.
