# Django create commands

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\api-backend"

python -m venv env
.\env\Scripts\Activate.ps1

pip install django djangorestframework django-unfold
django-admin startproject django_backend .
python manage.py startapp django_app

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

If the env already exists, only activate it before running Django:

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\api-backend"
.\env\Scripts\Activate.ps1
python manage.py runserver
```

- `python -m venv env` — isolated Python for this project only
- `.\env\Scripts\Activate.ps1` — use that env in the current terminal
- `startproject django_backend .` — project settings live in this folder (the `.` means current directory)
- `startapp django_app` — app for models, views, admin
- Superuser: `administrator` / `Admin123!@#` (`admin@carsv.com`)
- Customer user: `Ayheng` / `Ayheng123!@#` (`namayheng12345@gmail.com`)
- Admin: http://127.0.0.1:8000/admin/
- API root (DRF): http://127.0.0.1:8000/api/
- If port 8000 is busy: `python manage.py runserver 8001` then use http://127.0.0.1:8001/

Seed all garage tables (after migrate):

```powershell
python manage.py seed_users
python manage.py makemigrations django_app
python manage.py migrate
```

Inspection measurements (fuel / brake pads / tire tread):

```powershell
python manage.py makemigrations django_app
python manage.py migrate
python manage.py seed_users
```

React (second terminal):

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\web-frontend"
npm install
npm run dev
```

- Frontend: http://127.0.0.1:3000/
- Vite is set to port 3000 (`--host=0.0.0.0`)

Sync Customer / Staff / Technician rows to their User FK:

```powershell
python manage.py migrate
```

Role table (users move between Customer / Staff / Technician when their role changes):

```powershell
python manage.py makemigrations django_app
python manage.py migrate
```

Rerun both (26 Sep 2026):

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\api-backend"
.\env\Scripts\Activate.ps1
python manage.py runserver
```

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\web-frontend"
npm run dev
```

Added invoices INV-2026-0002 / INV-2026-0003 (26 Sep 2026):

```powershell
cd "d:\Ayheng\AUB\Year 4\MGMT\car_garage\carsv-aub\api-backend"
.\env\Scripts\Activate.ps1
python manage.py seed_users
```

