# How to run CarSV (Windows and Linux)

Use relative paths from the repo root `carsv-aub/`. Do not hard-code `D:\...` or `/home/...`.

## Backend

### Windows (PowerShell)

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

If `env` already exists:

```powershell
cd api-backend
.\env\Scripts\Activate.ps1
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
python manage.py seed_users
python manage.py runserver
```

If `env` already exists:

```bash
cd api-backend
source env/bin/activate
python manage.py runserver
```

- Superuser: `administrator` / `Admin123!@#` (`admin@carsv.com`)
- Customer: `Ayheng` / `Ayheng123!@#` (`namayheng12345@gmail.com`)
- Admin: http://127.0.0.1:8000/admin/
- API: http://127.0.0.1:8000/api/
- Busy port: `python manage.py runserver 8001`

## Frontend (second terminal)

### Windows

```powershell
cd web-frontend
npm install
npm run dev
```

### Linux / macOS

```bash
cd web-frontend
npm install
npm run dev
```

- App: http://127.0.0.1:3000/
- Vite uses `--host=0.0.0.0` on port 3000

## Notes

- Activate the venv with `.\env\Scripts\Activate.ps1` on Windows, or `source env/bin/activate` on Linux/macOS.
- `env/` is gitignored — each OS creates its own virtualenv.
- Line endings are normalized via `.gitattributes` (`eol=lf`) so both OSes share the same text files.
