# CarSV — Full Project Recreation Prompt

Paste this entire document into Cursor, Gemini, ChatGPT, or another coding agent to rebuild **CarSV** (Automotive Garage Management System) as a frontend-only React demo.

---

## Role

You are a senior full-stack frontend engineer. Build a complete, production-quality **frontend-only** garage management application named **CarSV**. Use realistic mock data (no backend, no database). The app must look like a real SaaS product, not a student template.

Brand: **CarSV Auto Works & Precision Care** — Phnom Penh, Cambodia.
Tagline: Premier Automotive Diagnostics, Repair & Fleet Management.

---

## Tech stack (do not change)

- React 19 + TypeScript
- Vite 6 (`npm run dev` must serve on **port 3000**, `--host 0.0.0.0`)
- Tailwind CSS v4 via `@tailwindcss/vite`
- lucide-react icons
- recharts for reports
- motion (optional, for small transitions)
- Single global state via React Context (`AppContext`)
- Fonts: Plus Jakarta Sans + JetBrains Mono (Google Fonts)
- Images: Unsplash URLs for vehicles/avatars; local JPGs optional for service catalog

Do **not** require a Gemini API key. Do **not** add a real backend. Auth is mock-only.

---

## Product concept

CarSV has **two surfaces**:

1. **Public customer website** (“What are we?”) — marketing landing with services, booking CTA, customer login/register.
2. **Staff ERP** — sidebar + navbar command center for garage operations.

Roles:

| Role | Demo user | Email | Purpose |
|---|---|---|---|
| ADMIN | Marcus Vance | admin@carsv.com | Full system, users, permissions, CCTV, settings |
| MANAGER | Sarah Jenkins | manager@carsv.com | Operations, revenue, dispatch, reports |
| STAFF | Alex Wong | staff@carsv.com | Front desk: customers, vehicles, appointments, invoices |
| TECHNICIAN | Dara Kim | dara.kim@carsv.com | Assigned tasks, inspections, work-order progress |
| CUSTOMER | John Doe | john.doe@example.com | Own vehicles, bookings, live tracking, invoices, CCTV |

Passwords are cosmetic. Login by matching email against mock users. Provide 1-click demo role buttons on the staff login screen.

Start **unauthenticated** on the public landing. Staff login is a separate path from the landing (“Staff / ERP Login”). Customer login opens a modal then the dedicated customer portal (no staff sidebar).

Theme: light default, persist in `localStorage` key `carsv_theme`. Dark mode via `html.dark` class. Customer landing/portal uses a `customer-theme-root` wrapper so light mode remaps dark slate classes to a clean white/slate look.

---

## Garage workflow to support in UI

```
Login → Customer → Vehicle → Booking → Check-in → Inspection → Diagnosis
→ Work Order → Assign Mechanic → Use Parts → Progress → Quality Check
→ Invoice → Payment → Checkout → Service History
```

Work-order status stepper:

`PENDING → ASSIGNED → IN_PROGRESS → QUALITY_CHECK → COMPLETED → DELIVERED`

Allow a waiting-parts state on the vehicle (`WAITING_PARTS`).

Cost formulas:

- Subtotal = Labor + Service + Parts
- Grand Total = Subtotal − Discount + Tax
- Remaining Balance = Grand Total − Amount Paid
- Default labor rate: **$35/hour**
- Default tax: **10%**
- Currency: USD

---

## Data models (TypeScript)

Implement these entities (fields can match this list closely):

**User** — id, name, email, phone, role (`ADMIN|MANAGER|STAFF|TECHNICIAN|CUSTOMER`), avatar, status (`ACTIVE|INACTIVE|SUSPENDED`), lastLogin, createdAt, specialization?

**Customer** — id, name, phone, email, address, avatar?, notes?, status (`ACTIVE|INACTIVE|VIP`), createdAt, lastServiceDate?, totalSpent, vehicleIds[]

**Vehicle** — id, customerId, customerName, brand, model, year, licensePlate, vin, mileage, color, fuelType (`Gasoline|Diesel|Hybrid|Electric`), transmission (`Automatic|Manual`), status (`READY|IN_REPAIR|WAITING_PARTS|INSPECTION|COMPLETED`), lastServiceDate, image, notes?

**Appointment** — id, customerId/Name/Phone, vehicleId, vehicleInfo, serviceName/Id, date (YYYY-MM-DD), time (HH:mm), problemDescription, priority (`LOW|MEDIUM|HIGH|URGENT`), status (`SCHEDULED|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW`), assignedStaff, estimatedDurationHours, notes?

**ServiceItem** — id, name, category (`Maintenance|Engine|Brakes|Electrical|Transmission|Tires|AC & Heating|Body`), description, basePrice, estimatedDurationHours, requiredParts[], status, timesPerformed, imageUrl?

**WorkOrder** — id, workOrderNumber (`WO-1024`), customer + vehicle fields, reportedProblem, priority, status, assignedTechnician, cctvBayId?, estimated/actual cost, laborRatePerHour, laborHoursEstimated/Actual, services[], tasks[], partsUsed[], before/after photos, before/after InspectionReport, invoiceId?, isPaid, createdAt, completedAt?, notes?

**RepairTask** — id, workOrderId, title, description, vehicleInfo, technician, priority, dueDate, estimatedHours, actualHours?, progress 0–100, status (`PENDING|ASSIGNED|IN_PROGRESS|COMPLETED`)

**InspectionReport** — type `BEFORE_REPAIR|AFTER_REPAIR`, inspector, date, mileage, fuelLevelPercent, exterior/interior/engine condition, existingDamages[], checkItems (category + PASS/ATTENTION/FAIL/NOT_CHECKED), photos, signature date, notes

**Technician** — name, specialization, availability (`AVAILABLE|BUSY|ON_LEAVE|OFF_DUTY`), active/completed task counts, completionRatePercent, rating 1–5, hourlyRate, skills[]

**InventoryPart** — name, sku, category (`Brakes|Engine|Filters|Fluids & Oils|Electrical|Suspension|Tires|Body & Trim`), stockQuantity, minStockLevel, unitPrice, costPrice, supplier, location (e.g. Shelf A-12), status (`IN_STOCK|LOW_STOCK|OUT_OF_STOCK`)

**Supplier, PurchaseOrder, Invoice, InvoiceItem, PaymentRecord, CCTVCamera, CustomerFeedback, ActivityLog, NotificationItem, GarageDocument, GarageSettings, RolePermissions**

Invoice status: `PAID|PENDING|OVERDUE|PARTIAL|CANCELLED`  
Payment methods: Credit Card, Cash, Bank Transfer, ABA PayWay, Stripe, Cheque

Role permissions matrix: per module (Customers, Vehicles, Appointments, WorkOrders, Tasks, Inventory, Reports, Users, CCTV, Settings) with view/create/edit/delete booleans.

---

## Seed data (must exist)

**Customers (Phnom Penh):**
- John Doe — VIP — St. 271, Boeung Tumpun — $3,450 spent — vehicles PP-1234, PP-8822
- Sokha Chan — Toul Kork — Honda Civic RS PP-5678
- Dara Kim — Norodom Blvd — Ford Ranger Wildtrak PP-9012
- Sopheak Lim — VIP — Lexus RX350 PP-4433
- Linda Smith — BKK1 — Hyundai Tucson PP-7711

**Vehicles:** Toyota Camry Hybrid 2022 PP-1234 (IN_REPAIR), Honda Civic RS Turbo 2021, Ford Ranger Wildtrak 4x4 (WAITING_PARTS), Lexus RX350, Mazda CX-5, Hyundai Tucson N-Line. Use Unsplash car photos.

**Services (8):** Oil change $65, Brake pads $120, Engine diagnostic $50, AC recharge $95, Battery replacement $145, Wheel alignment $45, ATF flush $160, 60-point inspection $40.

**Technicians:** Dara Kim (Engine & Hybrid), Sokha Chan (Brakes & Suspension), Vannak San (Electrical & AC).

**Work orders:** at least WO-1024 (Camry brakes, in progress, bay CCTV), plus completed Civic and others.

**Inventory:** several parts including at least one LOW_STOCK and one OUT_OF_STOCK. Suppliers and 1–2 purchase orders.

**Invoices:** INV-2026-089 etc. Mix of PAID / PENDING / PARTIAL. Payments with ABA PayWay and cash.

**CCTV bays:** Bay 01 Engine Diagnostics, plus underbody, brakes, lift, wash, interior placeholders.

**Garage settings:**
- Phone: +855 23 999 888
- Email: service@carsv.com
- Address: Building 188, St. 271, Phnom Penh
- Hours: Mon–Sat 07:30–18:00, Sunday closed
- Tax ID: K009-882910398
- 12-month / 20,000 km warranty copy on invoices

---

## Architecture

```
src/
  main.tsx
  App.tsx
  index.css
  types.ts
  vite-env.d.ts
  context/AppContext.tsx
  data/mockData.ts
  components/
    auth/LoginView.tsx
    layout/Sidebar.tsx, Navbar.tsx, GlobalSearchModal.tsx
    common/Modal, ConfirmModal, ToastContainer, StatCard, StatusBadge, ProgressBar, ThemeToggle
    dashboards/AdminDashboard, ManagerDashboard, StaffDashboard, TechnicianDashboard, CustomerPortal
    customers/CustomerList, CustomerDetailView, CustomerFormModal
    vehicles/VehicleList, VehicleDetailView, VehicleFormModal
    appointments/AppointmentManager, AppointmentFormModal
    services/ServiceCatalog, ServiceFormModal
    workorders/WorkOrderList, WorkOrderDetailView, WorkOrderFormModal
    inventory/InventoryList, InventoryFormModal
    technicians/TechnicianList, TechnicianDetailModal
    invoices/InvoiceList, InvoiceDetailModal
    reports/ReportsView.tsx
    security/CCTVMonitoringView.tsx
    feedback/FeedbackList.tsx
    settings/SettingsView.tsx
    customer/
      CustomerPublicLanding.tsx
      CustomerAuthModal.tsx
      CustomerPortalApp.tsx
      CustomerDashboardHome, Vehicles, Appointments, WorkOrderTracking,
      Invoices, Documents, Feedback, Profile, Products,
      BookAppointmentModal
```

**App.tsx routing (view switch, not React Router):**

- Unauthenticated → public landing + customer auth modal, or staff LoginView
- `currentRole === 'CUSTOMER'` → full-screen CustomerPortal (no ERP sidebar)
- Staff → Sidebar + Navbar + main workspace

Staff views: Dashboard, Customers, CustomerDetail, Vehicles, VehicleDetail, Appointments, Services, WorkOrders, WorkOrderDetail, Inventory, Technicians, Invoices, Reports, CCTV, Feedback, Settings.

Keep **one source of truth** for view IDs (PascalCase: `Dashboard`, `Customers`, `WorkOrders`, `WorkOrderDetail`, etc.) and use those same strings in App, Sidebar, and Navbar.

**AppContext must provide:**
- Auth: isAuthenticated, currentUser, currentRole, login, logout, switchRole, switchUser
- Theme: theme, toggleTheme, setTheme
- Navigation + selected IDs + deep-link helpers (`viewWorkOrderDetail`, etc.)
- All entity arrays
- CRUD mutators that also write ActivityLog + Toast
- confirm dialog + toasts
- `resetMockData()`
- `adjustStock()` that updates LOW_STOCK / OUT_OF_STOCK
- `recordPayment()` that updates invoice balance and PAID/PARTIAL
- Role permission map (sidebar hides items the role cannot view)

Default demo user after staff login: Marcus Vance ADMIN. Do not auto-login on first load.

---

## UI / UX requirements

### Visual language
- Staff ERP: clean SaaS — white cards, slate-100 canvas, blue-600 primary, rounded-xl/2xl, subtle borders (`border-gray-100`), StatCards, status pills
- Dark ERP: slate-950 canvas, slate-900 cards
- Customer site: more marketing — gradient blue/sky, large hero, service cards, testimonials, map/contact footer
- Title in `index.html`: `CarSV — Automotive Garage Management System`

### Staff layout
- Collapsible dark sidebar (`#111827`), brand “CarSV PRO”
- Sections: OPERATIONS / WORKSHOP & REPAIRS / INVENTORY & BILLING / ANALYTICS & SYSTEM
- Live badges: today’s appointments, urgent tasks, low-stock, unread notifications, active WOs
- Navbar: breadcrumbs, global search (Cmd/Ctrl+K), theme toggle, notifications, role switcher, logout
- Confirm modal for deletes; toast stack for success/warning/error/info
- Responsive: mobile drawer sidebar, stacked cards

### Role dashboards
- **Admin:** KPIs (revenue $42,850, customers, vehicles, active WOs), CCTV bay preview, recent activity, low stock, quick-create
- **Manager:** revenue trend, WO status mix, technician workload, low-stock alerts, today’s appointments
- **Staff:** today bookings, check-in button (appointment → IN_PROGRESS), walk-in shortcuts, active WOs
- **Technician:** my tasks with Start / progress / Complete, photo-upload placeholder, parts used, overdue/urgent

### Module behavior (CRUD + search/filter)
- **Customers:** list + search (name/phone/email/id) + status filter + add/edit modal + detail (vehicles, bookings, WOs, spend)
- **Vehicles:** list + plate/VIN/brand search + owner link + detail (history, WOs, parts)
- **Appointments:** calendar/list, book modal (customer → vehicle → service → date/time → problem), cancel, check-in
- **Services:** catalog cards with prices/duration, add/edit
- **Work orders:** list, create from customer/vehicle, detail workspace with status stepper, add tasks, add parts (deduct stock, block if qty invalid), inspection checklists, before/after photos placeholders, generate invoice
- **Inventory:** table, low-stock highlight, add part, stock adjust ADD/REMOVE/AUDIT
- **Technicians:** list + detail modal (skills, workload, rating)
- **Invoices:** list, printable-style detail, record payment (full + partial), tax/discount line items
- **Reports:** Recharts bar/line/pie — monthly revenue labor vs parts, service category mix, technician jobs; WEEK/MONTH/YEAR toggle; export toast (PDF/Excel prototype)
- **CCTV:** grid/single, night vision toggle, snapshot toast, bay labels with current vehicle/WO/tech
- **Feedback:** star ratings + manager reply
- **Settings:** garage profile, labor/tax, notification toggles, **Reset Sample Data**
- **Global search** across customers, vehicles (plate), WOs, invoices

### Customer portal tabs
Dashboard, My Vehicles, Appointments, Repair Tracking (progress + CCTV if enabled), Parts/Products, Invoices, Documents, Feedback, Profile. Book-appointment modal. Notifications. Back to public site. Do not show other customers’ data — filter by John Doe / current user email.

### Public landing
Hero, services filter by category, “Book now”, “Customer Portal”, “Staff Login”, operating hours, address, phone, trust badges (CCTV, warranty, certified techs).

### Validation / empty / error UX
Required fields on customer, vehicle, booking, work order, payment. Toast on login failure fallback to admin only on staff form if email unknown. Empty states on lists. Loading spinner on login buttons (~400ms fake delay).

---

## Permissions (sidebar visibility)

- ADMIN: everything including Users, Permissions, Activity Logs, Settings
- MANAGER: operations + reports + CCTV + feedback + settings (no user delete)
- STAFF: customers, vehicles, appointments, services, WOs, invoices, inventory view; no reports/users/settings
- TECHNICIAN: WOs, tasks, CCTV, vehicles/customers view; no billing/settings
- CUSTOMER: never uses staff sidebar — dedicated portal only

---

## Quality bar

- TypeScript throughout, no `any` unless unavoidable
- All lists must work with empty arrays
- Mutating stock, payments, WO status, and appointments must immediately update dashboards and badges
- Dark/light must not break contrast on badges/buttons
- App must run with `npm install` then `npm run dev` and open at `http://localhost:3000`
- Include `.gitignore` (node_modules, dist, .env*)
- package.json name can be `carsv` / `react-example`; scripts: `dev`, `build`, `preview`, `lint` (`tsc --noEmit`)

Build the entire application in one pass, file by file, until every screen above exists and is wired to AppContext.
