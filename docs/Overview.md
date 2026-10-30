# CarSV / CGMS — Project Overview (for AI / new contributors)

Use this file as the **first context dump** when briefing another AI or developer. For deeper detail, see `docs/Car Garage Management System Document.md`, `guidelines/`, `DOCKER.md`, and `RENDER.md`.

---

## 1. What this is

| Name | Meaning |
| --- | --- |
| **CarSV** | Product brand (“Car Service”) |
| **CGMS** | Course title: Car Garage Management System |

**AUB Year 4** group project: a full garage ops system where **customers** self-serve on a React website and **staff** run the workshop in **one** Django Unfold admin (`/admin/`), with menus filtered by role. **One Django + Postgres backend** is the source of truth.

**Problem solved:** track vehicles, appointments, check-in, inspection, mechanic work, parts stock, customer quote approval, invoices, payment proof, and pickup — instead of paper/chat.

**Brand cues:** accent yellow `#ffc400`, dark `#141519`. Fiction location: Phnom Penh (St. 271 style copy in print sheets).

---

## 2. Two surfaces (important)

| Surface | Who | Tech | Entry |
| --- | --- | --- | --- |
| Public site + customer portal | Customers | React 19 + Vite 6 + Tailwind 4 | `:3000` or live web |
| Staff ERP console | Garage staff | Django Unfold + custom CSS/templates | `/admin/` on API host |

- There is **no** separate React app per staff role.
- Customers **cannot** use `/admin/`.
- Staff **do not** self-register; an Administrator creates them.
- Day-to-day staff work is Unfold admin, not the staff REST ViewSets.

---

## 3. Repository layout

```
carsv-aub/
├── api-backend/                 # Django 6 + DRF + SimpleJWT
│   ├── django_backend/          # settings, urls, middleware
│   ├── django_app/              # models, admin, customer_api, role_access, tests
│   ├── catalog_media/           # baked catalog images
│   └── media/                   # private uploads (local)
├── web-frontend/                # React customer SPA
│   └── src/
│       ├── api/                 # client.ts, garage.ts
│       ├── context/AppContext.tsx
│       ├── components/customer/ # public + portal UI
│       ├── App.tsx / routes.ts
├── docker-compose.yml           # db + api + web
├── docs/                        # this overview + full report
├── guidelines/                  # ROLE_IN_DASHBOARD, TERMINAL_RUN (not “GUIDELINE & REPORT”)
├── DOCKER.md / RENDER.md / README.md
└── .env.example
```

`mobile-frontend/` is mentioned in older docs/README as “later” but is **not present** on disk. Prefer `guidelines/` over any stale `GUIDELINE & REPORT/` path in older docs.

Primary code you will edit:

- Backend domain + staff UI: `api-backend/django_app/` (`models.py`, `admin.py`, `customer_api.py`, `role_access.py`, templates under `templates/admin/django_app/`, static `carsv-admin.css`)
- Customer UI: `web-frontend/src/components/customer/` (other folders under `web-frontend/src/components/` may be leftover scaffolding — staff ops live in Unfold)

---

## 4. Tech stack (short)

| Layer | Stack |
| --- | --- |
| Customer UI | React 19, TypeScript, Vite 6, Tailwind 4, react-router-dom 7, lucide-react |
| Staff UI | django-unfold (~0.107), `carsv-admin.css`, custom modal form templates |
| Backend | Django ~6.1, DRF, SimpleJWT |
| DB | PostgreSQL 17 (Compose/Render); SQLite optional without Docker |
| Auth (customer) | Email/password (+ verify), Google GIS ID token, password reset — **not Auth0** |
| Auth (staff) | Django session; **username** + password |
| Tokens | Access JWT (~15 min) + HttpOnly refresh cookie `carsv_refresh` under `/api/auth/` |
| Email | Resend (HTTPS); console locally |
| Extra | Telegram bot alerts (optional); Gunicorn + WhiteNoise; Docker Compose; Render host |

---

## 5. Environments

| | Live | Local (Docker Compose) |
| --- | --- | --- |
| Branch (typical) | `ayheng` | `ayheng-local` |
| Website | https://carsv.chayhour.xyz (fallback https://carsv-web.onrender.com) | http://127.0.0.1:3000 |
| API / Admin | https://admin.carsv.chayhour.xyz (fallback https://carsv-api.onrender.com) | http://127.0.0.1:8000 |
| Admin login | `/admin/login/` | `/admin/login/` |
| DB | Render Postgres | Compose Postgres on host `5433` |

**Live and local databases are separate.** After backend code changes in Compose: `docker compose restart api`. Vite proxies `/api` and `/media` to the API.

See `guidelines/TERMINAL_RUN.md` and `DOCKER.md` for run commands.

---

## 6. Roles

`User.Role` codes: `ADMIN` · `MANAGER` · `RECEPTIONIST` · `MECHANIC` · `CASHIER` · `CUSTOMER`

| Role | Uses | Notes |
| --- | --- | --- |
| Customer | Website / portal only | Self-register or Google |
| Administrator | Full admin | Users/roles, everything |
| Manager | Ops + stock + billing + reports | No Accounts (Users/Roles) |
| Receptionist | Front desk, WOs, inspections, invoices | No payments/stock admin/reports/Accounts |
| Mechanic | Assigned work orders, inspections, parts | No front desk/billing/Accounts |
| Cashier | Invoices + payments | No workshop/bookings/reports/Accounts |

Menu visibility: `django_app/role_access.py`. Demo staff logins: `guidelines/ROLE_IN_DASHBOARD.md`.

---

## 7. Master visit flow

```
Customer registers / logs in
  → Adds vehicle
  → Books catalog service (Booking status PENDING)
  → Staff confirms booking
  → Check-in → Work order (RepairJob) + Inspection
  → Mechanic / diagnosing → WAITING_APPROVAL (quote)
  → Customer confirms or declines quote on /quotes
  → Repairing → Quality check
  → Invoice + payment (customer proof → staff verify)
  → Ready for pickup → Completed
  → History (+ optional Telegram/email along the way)
```

**Work order (`RepairJob`) statuses (canonical workshop spine):**

`WAITING` → `DIAGNOSING` → `WAITING_APPROVAL` → `REPAIRING` → `QUALITY_CHECK` → `READY_FOR_PICKUP` → `COMPLETED`  
(also `CANCELLED`)

Related statuses you will see in code:

| Entity | Key values |
| --- | --- |
| Inspection | `PENDING` → `CHECK_IN` → `COMPLETED` |
| Invoice | `DRAFT`, `UNPAID`, `PARTIAL`, `PAID`, `CANCELLED` |
| Payment | status `PENDING`/`PAID`/…; methods cash/bank/card/QR |
| Booking | mirrors job flow; also legacy `CHECKED_IN` / `IN_SERVICE` |

Progress % is derived from job status. Booking status is synced from the job. Advancing past certain gates is blocked by business rules (e.g. missing mechanic, blocking part requests, unpaid invoice) in helpers like `job_advance_block_reason`.

**Naming in UI:** `RepairJob` = “work order” (WO-####). `Booking` = visit appointment (BK-####).

**“Quote” on the customer portal** usually means the visit at `WAITING_APPROVAL` (invoice ensured + confirm/decline on `/api/customer/repairs/…`). There is also a separate **`Estimate`** model (sent/approved/rejected) — do not confuse the two. Prefer `models.py` over older Document §12 when they disagree (e.g. `InspectionRecommendation` is in code; the long report may lag).

---

## 8. Core domain model (mental map)

```
User ──< Customer / Staff / Mechanic profiles
Customer ──< Vehicle
Customer + Vehicle + Service ──> Booking
Booking ──1:1── RepairJob (work order)
RepairJob ──1:1── Inspection
RepairJob ──1:1── Invoice ──< Payment
Booking.service                 = original booked service
Booking ──< BookingService      = extra services on the visit
Booking ──< PartRequest         = parts on the visit / shop requests
Service / ServiceCategory       = bookable catalog
SparePart / SparePartCategory   = inventory
Inspection ──< InspectionImage
Inspection ──< InspectionRecommendation
```

### Line-item sources (critical)

Extra services and parts carry a **`source`** so the UI can separate origins:

| Source | Meaning |
| --- | --- |
| `BOOKING` | Original customer booking selection |
| `CUSTOMER` | Customer added later (portal) |
| `INSPECTOR` | Applied from inspector recommendation onto the quote |

Models: `BookingService.Source`, `PartRequest.Source`.

**Rules of thumb:**

- Original booked services/parts must **not** be removable via the “recommended extras” UI.
- Customer-added extras and inspector extras are removable from the quote where allowed.
- Declining/removing a recommended extra updates the quote lines; it should **not** delete the inspection recommendation history (`InspectionRecommendation.customer_declined`).

---

## 9. Inspection → quote recommendations (recent feature)

After inspecting the car, staff (inspector) can recommend **extra** catalog services and in-stock parts on the **Inspection** admin form (compact 2-column checklist under Condition).

Flow:

1. Admin saves inspection recommendations (`InspectionRecommendation` rows; kind `SERVICE` / `PART`).
2. On completion / quote path, recommendations are **applied** as `BookingService` / `PartRequest` with `source=INSPECTOR` (linked back to the recommendation).
3. Customer **Quotes** page (`CustomerQuotesView`) shows:
   - Planned work (original + customer-added services)
   - Parts on this visit (original + customer-added parts)
   - **Recommended Extra Services & Parts** (inspector lines; removable)
   - Inspection findings
   - Estimated total
4. Removing a recommended line declines/unlinks it without wiping the inspection record.

Already-booked customer services/parts are **locked out** of the recommend checklist in admin.

Implementation touchpoints:

- Models: `InspectionRecommendation`, sources on `BookingService` / `PartRequest`
- Admin: `InspectionGarageForm` + `modal_form_fields.html` + `.cf-rec-*` CSS
- Customer: `web-frontend/src/components/customer/CustomerQuotesView.tsx`
- Spec that drove it: `update.md`

---

## 10. Customer website / portal routes

**Public:** `/`, `/about`, `/services`, `/how-it-works`, `/live-bay`, `/blog`, `/contact`, `/verify-email`, `/reset-password`

**Portal (role `CUSTOMER`):**

| Path | Purpose |
| --- | --- |
| `/dashboard` | Overview |
| `/vehicles` | Own vehicles CRUD |
| `/appointments` | Bookings + book modal (multi service/parts in stages) |
| `/tracking` | Work-order progress |
| `/quotes` | Approve / decline quote; review recommended extras |
| `/parts` | Parts catalog + requests |
| `/invoices` | Bills + payment claims |
| `/documents` | Docs helpers |
| `/reviews` | Feedback UI |
| `/notifications` | In-app notifications |
| `/profile` | Account |

API client talks to `/api/customer/...` with Bearer access token (+ refresh cookie).

---

## 11. API map (high level)

| Prefix | Audience |
| --- | --- |
| `/api/auth/` | Login, refresh, register, password reset, Google |
| `/api/public/` | Catalog, blog (unauthenticated) |
| `/api/customer/` | Customer portal CRUD / actions |
| `/api/` ViewSets | Staff/admin-oriented REST (admins); ops mainly Unfold |
| `/admin/` | Unfold staff console |
| `/media/` | Catalog public prefixes or signed private files |

Examples under `/api/customer/`: `vehicles/`, `bookings/` (+ cancel/reschedule/add-service/remove-service), `repairs/` (+ confirm/decline), `inspections/`, `services/`, `invoices/`, `payments/`, `parts/`, `part-requests/`, `notifications/`.

---

## 12. Parts & payments (brief)

- **PartRequest** fulfillment: workshop install / counter pickup / delivery. Statuses include `PENDING`, `NOTED`, `CONFIRMED`, `CANCELLED`.
- Workshop install parts stay tied to the visit quote; stock rules apply when issuing.
- **Invoice** is created/ensured around waiting-approval / visit billing helpers (`ensure_visit_invoice`).
- Customer uploads payment proof; cashier/admin verifies. Totals must stay consistent when extras are removed.

---

## 13. Conventions for agents working on this repo

1. **Preserve existing UX** unless asked otherwise — Unfold modal grid (`.cf-fields` 2-col), customer Tailwind patterns, brand yellow `#ffc400`.
2. **Reuse models/helpers** — do not invent a parallel quote/parts system; extend `BookingService` / `PartRequest` / `InspectionRecommendation`.
3. **Respect sources** — never let “remove recommended” delete original `BOOKING` lines.
4. **Admin forms:** custom fields often render via `templates/admin/django_app/modal_form_fields.html`. Watch CSS specificity (e.g. `.cf-field label { display:block }` vs row checkboxes).
5. **Static/admin CSS:** update `django_app/static/.../carsv-admin.css` and `collectstatic` when Compose serves `staticfiles`.
6. **Compose:** restart `api` after backend/template changes; hard-refresh browser for CSS.
7. **Do not commit secrets**; follow user git rules (commit only when asked).
8. Prefer existing guidelines over guessing ports/credentials.

---

## 14. Where to dig next

| Need | File |
| --- | --- |
| Full report / every page | `docs/Car Garage Management System Document.md` |
| Role menus + demo logins | `guidelines/ROLE_IN_DASHBOARD.md` |
| Local commands | `guidelines/TERMINAL_RUN.md`, `DOCKER.md` |
| Hosting | `RENDER.md` |
| Inspector recs spec | `update.md` |
| Domain + status machines | `api-backend/django_app/models.py` |
| Staff forms/admin | `api-backend/django_app/admin.py` |
| Customer HTTP API | `api-backend/django_app/customer_api.py` |
| Customer quotes UI | `web-frontend/src/components/customer/CustomerQuotesView.tsx` |

---

## 15. One-sentence summary

**CarSV is a Django+React garage system: customers book and approve quotes on the website; staff run bookings → inspection (with optional recommended extras) → repair → invoice → payment in a role-filtered Unfold admin, all against one Postgres-backed API.**
