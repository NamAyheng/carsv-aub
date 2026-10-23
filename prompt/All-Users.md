# CarSV accounts (Render test)

## Django admin (API)

| Field | Value |
| --- | --- |
| URL | https://carsv-api.onrender.com/admin/ |
| Username | `CarSVAdministrator` |
| Email | `admin@carsv.app` |
| Password | `CarSV123!@#` |

After first successful login, delete `DJANGO_SUPERUSER_PASSWORD` from the Render API environment.

## Customer portal (frontend)

| Field | Value |
| --- | --- |
| URL | https://carsv-web.onrender.com |
| Email sign-in | Email + password |
| Email for Resend test | `namayheng12345@gmail.com` only |
| Google | Client ID is on Render API (`GOOGLE_CLIENT_ID`) |
| Telegram bot | `@CarSVGarageBot` |

### Finish Google (one-time in Google Cloud Console)

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Open OAuth client ID `919651873814-khshba9va6tct09u6bdhijkn62d3r703...`
3. Under **Authorized JavaScript origins**, add:
   - `https://carsv-web.onrender.com`
   - `http://127.0.0.1:3000` (local)
4. Save. Wait 1–5 minutes, then hard-refresh the site.

### Finish Telegram (one-time in BotFather)

1. Open Telegram → `@BotFather`
2. `/mybots` → **CarSVGarageBot** → **Bot Settings** → **Domain**
   - or send `/setdomain` and choose the bot
3. Set domain to: `carsv-web.onrender.com` (no `https://`)
4. Webhook is already set to `https://carsv-api.onrender.com/api/telegram/webhook/`

**Forgot password:** Sign In modal → Forgot password; Resend only delivers to `namayheng12345@gmail.com` until a custom domain is verified.
