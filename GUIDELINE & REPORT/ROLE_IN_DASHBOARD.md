# Roles in the admin dashboard (live hosting)

Staff use the **same** Unfold admin. Menus and dashboard KPIs **appear or disappear by role**. Customers use the website only — they cannot open `/admin/`.

New staff are created by an **Administrator** (role + password). No public staff signup.

---

## Login (Render)

- URL: https://carsv-api.onrender.com/admin/
- Use **username** + password (not email). Case-sensitive.

---

## What each role sees

| Role | Dashboard focus | Sidebar (main) |
| --- | --- | --- |
| **Administrator** | Full KPIs, users/roles, reports | Everything |
| **Manager** | Revenue, jobs, stock, reports | Ops + stock + billing + reports — **no** Accounts (Users/Roles) |
| **Receptionist** | Today bookings, jobs, fleet | Front desk + work orders/inspections + invoices — **no** payments, stock admin, reports, Accounts |
| **Mechanic** | My jobs, parts, bay | Work orders (assigned to me), inspections, parts — **no** front desk, billing, Accounts |
| **Cashier** | Pending pay, revenue today | Invoices + payments — **no** workshop, bookings, reports, Accounts |
| **Customer** | — | Website only |

---

## Staff accounts (live)

| Username | Email | Password | Role |
| --- | --- | --- | --- |
| `CarSVAdministrator` | `admin@carsv.local` | `CarSV123!@#` | Administrator |
| `rotha-carsv` | `rotha@carsv.com` | `Rotha123!@#` | Manager |
| `sokheng-carsv` | `sokheng@carsv.com` | `Sokheng123!@#` | Receptionist |
| `makara-carsv` | `makara@carsv.com` | `Makara123!@#` | Mechanic |
| `lina-carsv` | `lina@carsv.com` | `Lina123!@#` | Cashier |

After login, the hello strip shows **name + email** and KPIs for that role.
