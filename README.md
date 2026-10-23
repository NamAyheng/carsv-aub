# CarSV

AUB Year 4 — Car Garage Management System.

| Folder | Role |
| --- | --- |
| `api-backend/` | Django admin + REST API |
| `web-frontend/` | React customer portal |
| `mobile-frontend/` | React Native (later) |

Works on **Windows** and **Linux** (same repo). Use the OS block that matches your machine.

### Docker Compose (recommended for teammates)

PostgreSQL + Django + React in containers — see **[DOCKER.md](DOCKER.md)**.

```bash
cp .env.example .env
docker compose up --build
```

- App: http://localhost:3000  
- Admin: http://localhost:8000/admin/  

Local SQLite (`api-backend/db.sqlite3`) stays untouched; Compose uses its own Postgres volume (`carsv-db` on host port **5433**).

## Django (API + Admin)

### Windows (PowerShell)

```powershell
cd api-backend
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

### Linux / macOS (bash)

```bash
cd api-backend
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

- Admin: http://127.0.0.1:8000/admin/ — `administrator` / `Admin123!@#`
- API root `GET /api/` returns 401 until you send `Authorization: Bearer <access>`

```bash
# Admin access token. The refresh token is an HttpOnly cookie, not in the JSON.
curl -c cookies.txt -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"administrator","password":"Admin123!@#"}'

curl http://127.0.0.1:8000/api/users/ \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Customer access. This token can call /api/customer/..., not /api/users/.
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"namayheng12345@gmail.com","password":"Ayheng123!@#"}'
```

## React frontend

Needs **Node.js 18+**.

### Windows (PowerShell)

```powershell
cd web-frontend
npm install
npm run dev
```

### Linux / macOS (bash)

```bash
cd web-frontend
npm install
npm run dev
```

Open http://localhost:3000 (or http://127.0.0.1:3000).

| Role | Login |
| --- | --- |
| Admin (Django / API) | username `administrator` / `Admin123!@#` |
| Customer | `namayheng12345@gmail.com` / `Ayheng123!@#` |
