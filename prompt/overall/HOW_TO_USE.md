# How to Run

Need: Node.js 18+ and Python 3.12+. Use 3 terminals.

## 1. Backend (Django)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver 0.0.0.0:8000
```

- API: http://127.0.0.1:8000/api/health/
- Catalog: http://127.0.0.1:8000/api/catalog/
- Admin: http://127.0.0.1:8000/admin/
- Login: `admin` / `GarageAdmin123!`

## 2. Website (React)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 3. Mobile ()

No phone needed. Preview in the browser:

```powershell
cd mobile
npm install
npx expo start --web
```

Open http://localhost:8082 (or the URL Expo prints).

If you later have a phone: `npx expo start`, install Expo Go, scan the QR code.

## First-time backend setup

Only if `.venv` is missing:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```
