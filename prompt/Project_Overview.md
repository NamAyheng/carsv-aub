# CarSV — Project Overview Prompt

Use this document to explain, present, or brief someone on **CarSV**. It describes what the product is, who uses it, the **core garage flow**, and every major module.

---

## 1. What this project is

**CarSV** (Car Service) is a comprehensive **Automotive Garage Management and Repair Task Management System**.

It is a frontend-only React demo for a university MGMT assignment. There is no real backend or database. Customers, vehicles, bookings, repairs, parts, invoices, and payments all live in mock data and React Context.

The fictional workshop is:

| Field | Value |
|---|---|
| Brand | **CarSV Auto Works & Precision Care** |
| Location | Building 188, St. 271, Phnom Penh, Cambodia |
| Tagline | Premier Automotive Diagnostics, Repair & Fleet Management |
| Hours | Monday–Saturday 07:30 AM – 06:00 PM; Sunday closed |
| Currency | USD |
| Labor rate | $35 / hour |
| Tax | 10% |
| Warranty copy | 12-month / 20,000 km on OEM replacement parts |

The goal is to model a real garage’s **business workflow**, not only a CRUD table: reception, workshop, parts counter, cashier, manager, and customer all see the same job from different screens.

---

## 2. Problem it solves

A typical garage juggles many disconnected steps:

- Who owns this car?
- When is it booked?
- What is wrong with it?
- Which mechanic is working on it?
- Are the spare parts in stock?
- How much will it cost?
- Has the customer paid?
- Is the car ready for pickup?

CarSV puts those steps in one app so staff can track a vehicle from **booking → check-in → repair → invoice → checkout**, and the customer can watch progress from a portal.

---

## 3. Two product surfaces

### A. Public customer website (“What are we?”)

Marketing landing for people who are not logged in:

- Hero and garage story
- Service catalog (oil change, brakes, diagnostics, AC, battery, alignment, ATF flush, 60-point inspection)
- Book-now / customer portal CTAs
- Operating hours, phone, address
- Trust signals: CCTV, warranty, certified technicians
- **Customer login / register** modal
- Link to **Staff / ERP login**

### B. Staff ERP (command center)

Internal garage software after staff sign-in:

- Dark collapsible sidebar + top navbar
- Role-specific dashboard
- Modules for customers, vehicles, appointments, work orders, inventory, invoices, CCTV, reports, settings
- Global search, notifications, light/dark theme, role switcher

Customers **do not** use this sidebar. After customer login they get a dedicated **Customer Portal**.

---

## 4. Users and roles

| Role | Demo person | Email | Job in the garage |
|---|---|---|---|
| **ADMIN** | Marcus Vance | admin@carsv.com | Full control: users, permissions, CCTV, settings, all operations |
| **MANAGER** | Sarah Jenkins | manager@carsv.com | Dispatch, revenue, technician workload, reports, low-stock |
| **STAFF** | Alex Wong | staff@carsv.com | Front desk: register customers/vehicles, book, check-in, invoices |
| **TECHNICIAN** | Dara Kim | dara.kim@carsv.com | Assigned tasks, inspections, repair progress, parts used |
| **CUSTOMER** | John Doe | john.doe@example.com | Own cars, bookings, live tracking, invoices, feedback |

Passwords are cosmetic. Login matches **email** to a seeded user. The staff login screen has 1-click demo role buttons.

Authorization is by role: sidebar items and actions hide if that role cannot view/create/edit/delete the module.

---

## 5. Core Garage Flow

This is the main business path the assignment and the app are built around.

```
Login
  → Customer Registration
  → Vehicle Registration
  → Service Booking
  → Vehicle Check-in
  → Initial Inspection
  → Diagnosis
  → Repair Job / Work Order
  → Mechanic Assignment
  → Spare Parts Usage
  → Repair Progress
  → Quality Check
  → Invoice
  → Payment
  → Vehicle Checkout
  → Service History
```

### Step by step

1. **Login**  
   Staff or customer authenticates. Staff land in the ERP; customers land in the portal.

2. **Customer registration**  
   Reception creates a unique customer (name, phone, email, address, VIP/active status). Later search uses ID, name, phone, or email.

3. **Vehicle registration**  
   Each car belongs to one customer: plate, brand, model, year, color, VIN, mileage, fuel, transmission, status. Duplicate plate/VIN should be avoided.

4. **Service booking**  
   Customer or receptionist picks customer → vehicle → service → date/time → problem description. Statuses: Scheduled, Confirmed, In Progress, Completed, Cancelled, No-show.

5. **Vehicle check-in**  
   When the car arrives (booked or walk-in), staff mark the appointment in progress and record who received the vehicle.

6. **Initial inspection**  
   Mileage, fuel level, exterior/interior/engine condition, existing damage, photos, customer complaint. This is the **before-repair** report.

7. **Diagnosis**  
   Technician records findings, root cause, recommended repair, and required parts.

8. **Repair job / work order**  
   A numbered job is created (e.g. `WO-1024`) linking customer, vehicle, problem, services, estimate, and bay/CCTV camera.

9. **Mechanic assignment**  
   Manager or authorized staff assigns (or reassigns) a technician based on skill and workload.

10. **Spare parts usage**  
    Parts are pulled from inventory onto the work order. Quantity cannot exceed stock. Stock drops; low-stock / out-of-stock badges update.

11. **Repair progress**  
    Tasks show percent complete and status (Pending → Assigned → In Progress → Completed). Vehicle can sit in **Waiting for Parts** if stock is missing.

12. **Quality check**  
    After-repair inspection. Only then can the job move toward ready for pickup.

13. **Invoice**  
    When work is done, the system builds line items: labor, services, parts, discount, tax.

14. **Payment**  
    Full or partial payment (cash, card, bank transfer, ABA PayWay, etc.). Remaining balance = grand total − amount paid. Invoice becomes Paid or Partial.

15. **Vehicle checkout**  
    After quality check and (typically) payment, status goes to Completed then Delivered. Customer is notified that the car is ready.

16. **Service history**  
    The completed job is part of that vehicle’s and customer’s history for next maintenance.

---

## 6. Repair status workflow

Workshop jobs use this stepper:

```
PENDING → ASSIGNED → IN_PROGRESS → QUALITY_CHECK → COMPLETED → DELIVERED
```

Vehicle status alongside the job can be:

`READY | IN_REPAIR | WAITING_PARTS | INSPECTION | COMPLETED`

If parts are missing, the car can move to **Waiting for Parts**, then return to **In Progress** when stock arrives.

---

## 7. Money and stock logic

### Cost

- Labor cost = hours × labor rate ($35/hour by default)
- **Subtotal** = Labor + Service + Spare parts
- **Grand total** = Subtotal − Discount + Tax (10%)
- **Remaining balance** = Grand total − Amount paid

### Inventory

- Each part has SKU, shelf location, quantity, minimum stock, cost price, sale price
- Using a part on a work order **deducts** quantity
- Quantity ≤ 0 → Out of Stock; quantity ≤ minimum → Low Stock
- Alerts show on dashboard, sidebar badge, and inventory list
- Suppliers and purchase orders exist as a restock prototype

### Payments

Invoice statuses: Draft/Pending, Partial, Paid, Overdue, Cancelled.  
Partial pay is allowed. Payment history stays on the invoice.

---

## 8. Modules (what the app contains)

| Module | What it does |
|---|---|
| **Dashboards** | Role KPIs: customers, vehicles, today’s bookings, active jobs, pending pay, revenue |
| **Customers** | CRUD, search/filter, profile, vehicles, bookings, spend, service history |
| **Vehicles** | CRUD, owner link, plate/VIN search, current status, repair history |
| **Services** | Catalog by category, price, duration, required parts |
| **Appointments** | Book, confirm, check-in, cancel, today’s list |
| **Work orders** | Create job, stepper, tasks, parts, inspections, photos, generate invoice |
| **Technicians** | Skills, availability, workload, rating, assignment |
| **Inventory** | Parts stock, adjust ADD/REMOVE/AUDIT, low-stock |
| **Suppliers / PO** | Who supplies parts; purchase-order prototype |
| **Invoices** | Line items, tax, discount, printable detail |
| **Payments** | Record pay, receipt-style confirmation, methods |
| **CCTV** | Bay cameras, current vehicle/WO/tech, customer stream prototype |
| **Documents** | Inspection PDFs, invoices, warranty, vehicle papers |
| **Notifications** | Booking, repair status, ready for pickup, invoice, payment, reminders |
| **Feedback** | Star ratings + manager reply |
| **Reports** | Revenue, popular services, technician jobs, charts (week/month/year) |
| **Activity log** | Who created/updated customers, WOs, payments, settings |
| **Users & permissions** | Admin user accounts and view/create/edit/delete matrix |
| **Settings** | Garage name, hours, tax, labor rate, alerts, reset sample data |

### Customer portal tabs

Dashboard · My Vehicles · Appointments · Repair tracking (progress + CCTV) · Parts/products · Invoices · Documents · Feedback · Profile · Book appointment.

A customer sees **only their own** cars and jobs.

---

## 9. Role dashboards (in short)

- **Admin** — revenue, counts, CCTV preview, activity feed, low stock, quick create  
- **Manager** — revenue trend, work-order mix, technician load, today’s bookings  
- **Staff** — today’s appointments, check-in, walk-in shortcuts, active jobs  
- **Technician** — my tasks: start, progress, complete, photos, overdue/urgent  
- **Customer** — my cars, next booking, live repair %, invoices to pay  

---

## 10. Notifications the flow should produce

- Booking created / confirmed / cancelled  
- Vehicle checked in  
- Repair started / waiting for parts / completed  
- Ready for pickup  
- Invoice generated  
- Payment recorded  
- Maintenance reminder (e.g. next oil change = current mileage + 5,000 km)

---

## 11. UX and quality rules

- Light theme by default; dark mode saved as `carsv_theme`
- Toasts for success / warning / error / info
- Confirm dialog before delete
- Form validation on customer, vehicle, booking, parts qty, payment amount
- Empty states and loading spinners on login (~400 ms fake delay)
- Responsive: desktop ERP + usable tablet/mobile
- Changing stock, payment, or work-order status must update dashboard badges immediately
- No Gemini API required; ignore leftover `.env.example`

---

## 12. Tech snapshot

- React 19 + TypeScript + Vite 6 (port **3000**)
- Tailwind CSS v4
- lucide-react, recharts
- Global state: `AppContext` (no React Router; view switching)
- Seed data: `src/data/mockData.ts`
- Runnable folder: `carsv-aub/web-frontend`

Run:

```powershell
cd carsv-aub/web-frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## 13. One-sentence summary

CarSV is a Phnom Penh auto-workshop demo that walks a car through **booking, check-in, diagnosis, repair, parts, invoice, payment, and checkout**, with separate staff ERP and customer portal views, all on mock data.
