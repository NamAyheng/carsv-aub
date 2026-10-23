# Deploy CarSV on Render (free-tier testing)

This guide prepares a **remote** test deployment. It does **not** replace local Docker Compose or touch your local SQLite / `carsv-db` volumes.

Local workflow stays in `DOCKER.md` and `README.md`.

## Architecture

| Render service | Type | Purpose |
| --- | --- | --- |
| Frontend | Static Site | Vite `web-frontend/dist` |
| API | Web Service (Docker) | `api-backend/Dockerfile` |
| Database | Postgres (Free) | Remote test DB only (≈30-day free lifetime) |

Frontend build sets `VITE_API_URL` to the public API URL. The API uses CORS / CSRF / `FRONTEND_URL` pointing at the Static Site URL.

## Before you create services

Code in this repo already includes:

- Gunicorn bind to `$PORT` (local default `8000`)
- `/media/` serving with **public** catalog prefixes and **signed** private uploads
- Cross-site refresh cookie via `DJANGO_REFRESH_COOKIE_SAMESITE=None` + `DJANGO_COOKIE_SECURE=1`
- `DATABASE_URL` support for Render Postgres
- Resend **HTTPS** email backend (SMTP is blocked on Free Web Services)
- Optional env-based superuser bootstrap (idempotent; never overwrites existing users)
- Public catalog images baked from `api-backend/catalog_media/` into the Docker image (not private uploads)
- Optional one-time catalog demo seed via `DJANGO_SEED_DEMO=1` → `seed_catalog_demo` (off by default)

## Environment variables

### Static Site (build)

| Variable | Example |
| --- | --- |
| `VITE_API_URL` | `https://carsv-api.onrender.com` |

- **Root Directory:** `web-frontend`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Rewrite:** `/*` → `/index.html` (SPA)

### Web Service (runtime)

| Variable | Notes |
| --- | --- |
| `DJANGO_SECRET_KEY` | Strong random value (required) |
| `DJANGO_DEBUG` | `0` |
| `DJANGO_COOKIE_SECURE` | `1` |
| `DJANGO_REFRESH_COOKIE_SAMESITE` | `None` |
| `DJANGO_ALLOWED_HOSTS` | `carsv-api.onrender.com` (your API hostname) |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://carsv-web.onrender.com` |
| `DJANGO_CORS_ORIGINS` | `https://carsv-web.onrender.com` |
| `FRONTEND_URL` | `https://carsv-web.onrender.com` |
| `DATABASE_URL` | From Render Postgres dashboard |
| `EMAIL_BACKEND` | `django_app.email_backends.ResendAPIBackend` |
| `RESEND_API_KEY` | From Resend (never commit) |
| `DEFAULT_FROM_EMAIL` | Verified sender / `onboarding@resend.dev` for tests |
| `GOOGLE_CLIENT_ID` / `TELEGRAM_*` | Optional |
| `DJANGO_SUPERUSER_*` | Optional first boot only — remove password after login |
| `DJANGO_SEED_DEMO` | Optional: set `1` **once** on first deploy to seed public catalog (services/parts/blog). Leave unset or `0` afterward. Never creates users or private records. |

Do **not** set `DATABASE_URL`, `DJANGO_SUPERUSER_*`, or `DJANGO_SEED_DEMO` in local Compose `.env` unless you intend to.

## Media notes

- Catalog paths (`services/`, `parts/`, `blog/`, `products/`) are publicly readable.
- Private uploads (`payments/`, `vehicles/`, `inspections/`, `customers/`, `staff/`, `users/`, …) require a signed `?m=` query (issued by the API) or staff login.
- Tracked public assets live in `api-backend/catalog_media/` and are copied into `/app/media/` at **image build** time.
- Gitignored `api-backend/media/` holds local private uploads and is **never** deleted by deploy prep; it is **not** in the Render image.
- Free Web Service disk is **ephemeral**: customer uploads are lost on sleep/redeploy. Catalog files in the image survive redeploys until the next image rebuild.

## Manual deploy steps (correct order)

1. Push branch `ayheng` (no `.env` secrets). Connect Render to `NamAyheng/carsv-aub` → branch **`ayheng`**.
2. Create Render **PostgreSQL** (Free) → copy `DATABASE_URL`.
3. Create **Web Service**:
   - Root Directory: `api-backend`
   - Runtime: Docker / Dockerfile `./Dockerfile`
   - Set env vars above (include `DJANGO_SEED_DEMO=1` only if you want catalog rows on first boot)
   - Deploy → wait until live
4. Open `https://<api>.onrender.com/admin/` → log in with bootstrap superuser.
5. **Remove** `DJANGO_SUPERUSER_PASSWORD` from env. Set `DJANGO_SEED_DEMO=0` or delete it. **Manual Deploy**.
6. Create **Static Site**:
   - Root Directory: `web-frontend`
   - Build: `npm ci && npm run build`
   - Publish: `dist`
   - Env: `VITE_API_URL=https://<api>.onrender.com`
   - Rewrite: `/*` → `/index.html`
7. If the Static Site URL differs from the CORS/CSRF/`FRONTEND_URL` values, update the API env to match → redeploy API.
8. Smoke-test: register → Resend verify → login → browse services/parts → book → payment proof (expect ephemeral private media).

## Free-tier limits (reminder)

- API sleeps after ~15 minutes idle (~1 minute cold start).
- Free Postgres expires ~30 days; no backups.
- No persistent disk on Free Web Service.
- Outbound SMTP ports blocked — use Resend HTTPS.
- No free shell: use env bootstrap + optional `DJANGO_SEED_DEMO` instead of `populate_garage` (SQLite-only local command).

## Rollback

Delete or suspend Render services anytime. Local Compose / SQLite remain unchanged if you never pointed them at Render and never ran `docker compose down -v`.
