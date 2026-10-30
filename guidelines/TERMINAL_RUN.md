# Local run (terminal / Docker)

**Live hosting is already up** — you do not need this file to use production.

| Environment | URL | Guide |
| --- | --- | --- |
| **Live** website | https://carsv.chayhour.xyz (fallback: https://carsv-web.onrender.com) | Cloudflare: [CLOUDFLARE_DNS_HOUR04.md](CLOUDFLARE_DNS_HOUR04.md) |
| **Live** admin / API | https://admin.carsv.chayhour.xyz/admin/ (fallback: https://carsv-api.onrender.com/admin/) | [ROLE_IN_DASHBOARD.md](ROLE_IN_DASHBOARD.md) |
| **Live** deploy / env | Render | [RENDER.md](../RENDER.md) |
| **Google Sign-In origins** | — | [GOOGLE_OAUTH_ORIGINS.md](GOOGLE_OAUTH_ORIGINS.md) |
| **Local** | Docker or venv below | this file |

Local DB ≠ live DB. Branch for local work: `ayheng-local`. Live code: `ayheng`.

---

## Recommended: Docker Compose

From repo root `carsv-aub/`:

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Website | http://127.0.0.1:3000 |
| Admin / API | http://127.0.0.1:8000/admin/ · http://127.0.0.1:8000/api/ |

More detail: [DOCKER.md](../DOCKER.md).

Restart API after backend code changes (Gunicorn has no auto-reload):

```bash
docker compose restart api
```

---

## Optional: bare terminal (no Docker)

Use only if you are not using Compose. Paths are relative to `carsv-aub/`.

### Backend

**Windows (PowerShell)**

```powershell
cd api-backend
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_users
python manage.py runserver
```

**Linux / macOS**

```bash
cd api-backend
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_users
python manage.py runserver
```

If `env` already exists, activate it and run `python manage.py runserver` only.

### Frontend (second terminal)

```bash
cd web-frontend
npm install
npm run dev
```

App: http://127.0.0.1:3000

---

## Local seed logins (Docker / seed_users)

| Who | Login | Password |
| --- | --- | --- |
| Admin | username `administrator` | `Admin123!@#` |
| Staff | e.g. `sokha`, `dara`, `lin` | `Staff123!@#` |
| Customer (website) | `namayheng12345@gmail.com` | `Ayheng123!@#` |

Admin login uses **username**, not email. Live staff accounts are listed in [ROLE_IN_DASHBOARD.md](ROLE_IN_DASHBOARD.md) only.
