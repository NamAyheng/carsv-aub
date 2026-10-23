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

## Environment variables

### Static Site (build)

| Variable | Example |
| --- | --- |
| `VITE_API_URL` | `https://carsv-api.onrender.com` |

Build: `npm ci && npm run build`  
Publish directory: `dist`  
Rewrite: `/*` → `/index.html`

### Web Service (runtime)

| Variable | Notes |
| --- | --- |
| `DJANGO_SECRET_KEY` | Strong random value |
| `DJANGO_DEBUG` | `0` |
| `DJANGO_COOKIE_SECURE` | `1` |
| `DJANGO_REFRESH_COOKIE_SAMESITE` | `None` |
| `DJANGO_ALLOWED_HOSTS` | `carsv-api.onrender.com` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `https://carsv-web.onrender.com` |
| `DJANGO_CORS_ORIGINS` | `https://carsv-web.onrender.com` |
| `FRONTEND_URL` | `https://carsv-web.onrender.com` |
| `DATABASE_URL` | From Render Postgres dashboard |
| `EMAIL_BACKEND` | `django_app.email_backends.ResendAPIBackend` |
| `RESEND_API_KEY` | From Resend (never commit) |
| `DEFAULT_FROM_EMAIL` | Verified sender / `onboarding@resend.dev` for tests |
| `GOOGLE_CLIENT_ID` / `TELEGRAM_*` | Optional |
| `DJANGO_SUPERUSER_*` | Optional first boot only — remove password after login |

Do **not** set `DATABASE_URL` / superuser vars in local Compose `.env` unless you intend to.

## Media notes

- Catalog paths (`services/`, `parts/`, `blog/`, `products/`) are publicly readable.
- Private uploads (`payments/`, `vehicles/`, `inspections/`, `customers/`, …) require a signed `?m=` query (issued by the API) or staff login.
- Free Web Service disk is **ephemeral**: customer uploads are lost on sleep/redeploy. Catalog files should be present in the Docker build context (`api-backend/media/`).
- Local `api-backend/media/` is never deleted by this deploy prep.

## Manual deploy steps (after approval)

1. Push the repo (no `.env` secrets).
2. Create Render **Postgres** (Free) → copy `DATABASE_URL`.
3. Create **Web Service** from `api-backend` Dockerfile → set env → deploy.
4. Log into `/admin/` → **remove** `DJANGO_SUPERUSER_PASSWORD` from env → redeploy.
5. Create **Static Site** from `web-frontend` with `VITE_API_URL` → SPA rewrite.
6. Confirm CORS / CSRF / `FRONTEND_URL` match the Static Site URL.
7. Smoke-test register → verify email → login → book → pay proof (expect ephemeral media).

## Free-tier limits (reminder)

- API sleeps after ~15 minutes idle (~1 minute cold start).
- Free Postgres expires ~30 days; no backups.
- No persistent disk on Free Web Service.
- Outbound SMTP ports blocked — use Resend HTTPS.

## Rollback

Delete or suspend Render services anytime. Local Compose / SQLite remain unchanged if you never pointed them at Render and never ran `docker compose down -v`.
