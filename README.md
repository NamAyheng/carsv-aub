# CarSV

AUB Year 4 — Car Garage Management System.

| Folder | Role |
| --- | --- |
| `api-backend/` | Django admin + REST API |
| `web-frontend/` | React demo (mock data) |
| `mobile-frontend/` | React Native (later) |

## Django (API + Admin)

```powershell
cd api-backend
.\env\Scripts\Activate.ps1
python manage.py runserver
```

- Admin site: http://127.0.0.1:8000/admin/ — username `administrator` / `Admin123!@#`
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

```powershell
cd web-frontend
npm install
npm run dev
```

Open http://localhost:3000.

| Role | Login |
| --- | --- |
| Admin (Django / API) | username `administrator` / `Admin123!@#` |
| Customer | `namayheng12345@gmail.com` / `Ayheng123!@#` |
