# How to run CarSV

Django admin + API live in `carsv-aub/api-backend`. React demo lives in `carsv-aub/web-frontend`.

## Django API

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\api-backend"
.\env\Scripts\Activate.ps1
python manage.py runserver
```

- **API root:** http://127.0.0.1:8000/api/
- Admin: http://127.0.0.1:8000/admin/
- Login API: http://127.0.0.1:8000/api/login/
- Admin login: `administrator` / `Admin123!@#`

The API root is a Django REST Framework page that lists every endpoint (`/api/users/`, `/api/customers/`, `/api/vehicles/`, …). Open any of those links to browse JSON. If port 8000 is busy, use `python manage.py runserver 8001` and change the host to `http://127.0.0.1:8001/api/`.

## React frontend

Frontend-only React demo. No server, no real passwords. App folder: `carsv-aub/web-frontend`.

**Node.js 18+** → https://nodejs.org

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\web-frontend"
npm install
npm run dev
```

Open **http://localhost:3000**. Stop with `Ctrl+C`.

Logged out = public customer site. **Customer Sign In** or **Staff / ERP Login**.

Login matches **email only**. Type `123` in the password box (any value is accepted).

| Job           | Email                  | Password |
| ------------- | ---------------------- | -------- |
| Administrator | `admin@carsv.com`      | `123`    |
| Manager       | `manager@carsv.com`    | `123`    |
| Front desk    | `staff@carsv.com`      | `123`    |
| Mechanic      | `dara.kim@carsv.com`   | `123`    |
| Customer      | `john.doe@example.com` | `123`    |

Staff login also has **Demo staff accounts**. In the ERP navbar, **Try as** switches people (not extra roles on the same account).

**Demo:** Staff → customer + vehicle → appointment → check-in → work order → parts → invoice / payment. **Try as** Mechanic for tasks. Customer email for tracking. Admin/Manager for reports, CCTV, settings.

Refresh resets mock data. **Reset Sample Data** is in Garage Settings (Admin/Manager). Theme toggle is in the navbar.

If `vite` is missing, run `npm install` again. If port 3000 is busy, close the other process. Skip `.env` / Gemini — unused.
