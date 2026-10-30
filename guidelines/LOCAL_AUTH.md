# Local auth (same UX as live, separate database)

Local Compose and live Render share **code**, not data. Each environment has its own Postgres and its own customer accounts.

| | Local | Live |
| --- | --- | --- |
| Website | http://127.0.0.1:3000 | https://carsv.chayhour.xyz |
| API / admin | http://127.0.0.1:8000 | https://admin.carsv.chayhour.xyz |
| Config | root `.env` (from `.env.example`) | Render env vars |
| Database | Compose `carsv-db` | Render Postgres |

Auth providers on the customer site:

- **Google GIS** — sign-in / register
- **Email + password + 6-digit OTP** — form register / verify / login
- **Telegram** — **alerts / Profile connect only** (not a Google-style login button)

See also: [GOOGLE_OAUTH_ORIGINS.md](GOOGLE_OAUTH_ORIGINS.md), [Fill_In_Form.md](Fill_In_Form.md), [DOCKER.md](../DOCKER.md), [TERMINAL_RUN.md](TERMINAL_RUN.md).

---

## 1. One-time setup

```bash
cd carsv-aub
cp .env.example .env
# Set DJANGO_SECRET_KEY, POSTGRES_PASSWORD
# Copy GOOGLE_CLIENT_ID + TELEGRAM_* from your team vault / live Render (same client/bot is fine)
docker compose up --build
```

Prefer opening the site as **http://127.0.0.1:3000** (same host as `FRONTEND_URL` in `.env.example`).

Check the API sees Google:

```bash
curl -s http://127.0.0.1:8000/api/auth/public-config/
# google_client_id should be non-empty
```

---

## 2. Google Sign-In (local)

Same `GOOGLE_CLIENT_ID` as live. Google blocks the popup unless the **browser origin** is allowlisted.

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **OAuth 2.0 Client ID (Web)** → Authorized JavaScript origins, include:

- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://carsv.chayhour.xyz`
- `https://carsv-web.onrender.com`

If Google works on live but not local, origins are almost always the cause. Full list: [GOOGLE_OAUTH_ORIGINS.md](GOOGLE_OAUTH_ORIGINS.md).

Smoke: local site → **Sign in with Google** → customer portal (account lands in **local** DB only).

---

## 3. Email / password + OTP (local)

You do **not** need an admin to create the customer email first.

### Recommended for teammates (no Resend)

In `.env`:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=CarSV <noreply@carsv.local>
FRONTEND_URL=http://127.0.0.1:3000
```

1. Register on http://127.0.0.1:3000  
2. OTP screen appears  
3. Read the 6-digit code from API logs:

```bash
docker compose logs -f api | grep -i "verification code"
```

4. Enter the code → Sign in  

### Optional: real inbox (same as live)

```env
EMAIL_BACKEND=django_app.email_backends.ResendAPIBackend
RESEND_API_KEY=re_xxxxxxxx
DEFAULT_FROM_EMAIL=CarSV <noreply@carsv.chayhour.xyz>
FRONTEND_URL=http://127.0.0.1:3000
```

Requires Resend domain `carsv.chayhour.xyz` **verified** ([CLOUDFLARE_DNS_HOUR04.md](CLOUDFLARE_DNS_HOUR04.md)). Restart API after changing `.env`:

```bash
docker compose up -d api
```

---

## 4. Telegram alerts / connect (local)

Telegram talks to your API over a **public HTTPS webhook**. Plain `http://127.0.0.1:8000` cannot receive BotFather updates.

### Day-to-day (leave webhook on live)

Keep the bot webhook on Render so **live** customers get alerts:

```text
https://admin.carsv.chayhour.xyz/api/telegram/webhook/
```

Set / refresh with:

```bash
# From api-backend with live env, or on Render one-off / SSH:
python manage.py set_telegram_webhook --url https://admin.carsv.chayhour.xyz/api/telegram/webhook/
```

(Uses `TELEGRAM_BOT_TOKEN` + optional `TELEGRAM_WEBHOOK_SECRET`.)

Local Profile → Connect will not update the **local** DB while the webhook still points at live.

### Testing Telegram against the local database

1. Tunnel local API, e.g. Cloudflare Tunnel or ngrok:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
# or: ngrok http 8000
```

2. Point the webhook at the tunnel HTTPS URL + path:

```bash
docker compose exec api python manage.py set_telegram_webhook \
  --url "https://YOUR-TUNNEL.example/api/telegram/webhook/"
```

3. On local site: sign in → Profile → Connect Telegram → open bot → Start → share phone.  
4. Confirm `telegram_chat_id` on the **local** customer (admin or DB).  
5. **Restore live webhook** when finished so production alerts keep working:

```bash
python manage.py set_telegram_webhook --url https://admin.carsv.chayhour.xyz/api/telegram/webhook/
```

Root `.env` must include `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and (if used) `TELEGRAM_WEBHOOK_SECRET`.

---

## 5. Quick checklist

- [ ] `.env` from `.env.example` with `GOOGLE_CLIENT_ID` set  
- [ ] Google Console origins include `http://127.0.0.1:3000` and `http://localhost:3000`  
- [ ] `curl http://127.0.0.1:8000/api/auth/public-config/` shows `google_client_id`  
- [ ] Register + OTP works (console logs or Resend inbox) without admin creating the user  
- [ ] Google sign-in works on local  
- [ ] Telegram: webhook on live for prod; tunnel only when testing local connect  
- [ ] Never point local Compose at live `DATABASE_URL`

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Google popup / origin error | Add exact browser origin to Google Console; prefer `127.0.0.1:3000` |
| `google_client_id` empty | Set `GOOGLE_CLIENT_ID` in root `.env`, `docker compose up -d api` |
| OTP never arrives | Console backend → check `docker compose logs api`; Resend → domain verified + `DEFAULT_FROM_EMAIL` |
| Must use admin to “make email” | Use Register + OTP instead; admin is not required for customers |
| Telegram connect does nothing locally | Webhook still on live, or no tunnel; see §4 |
| Live Telegram broke after local test | Restore Render webhook URL (§4) |
