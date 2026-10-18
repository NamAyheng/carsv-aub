# Payment confirmation

Staff in Django admin verify payments. Customers never force an invoice to **Paid**.

## States (customer-facing)

| State | Meaning | Customer message |
| --- | --- | --- |
| **Unpaid** | No pending or verified payment covering the due amount | Pay the invoice |
| **Pending** | Payment claim submitted; not verified yet | Wait for verification |
| **Paid** | Staff verified; invoice balance cleared | Ready for pickup allowed |

Invoice DB status stays `UNPAID` / `PARTIAL` / `PAID` from **verified** payment totals only.

Payment row status: `PENDING` → `PAID` (Verify) or `FAILED` (Reject). Also `REFUNDED`.

## Who verifies

Any backend/admin user (not customers). Verify / Reject buttons use the same `ap-btn` style as work orders.

## Invoice vs Payments (admin)

- **Invoices** are display / billing sheets. Do not record or force payment status here.
- Forcing invoice status to **Paid** / **Partially paid** without matching verified payment totals shows a form error.
- Invoice list shows a payment warning (not a Record payment button).
- Invoice detail shows **Verify payment** when a pending claim exists (opens that payment). Otherwise a warning points staff to the Payments page.

## Customer pending → View / re-pay

While status is **Pending**, the Pay button becomes **View payment**. The customer can see amount, method, and proof. If the proof is wrong, **Request re-pay** calls `POST /api/customer/payments/{id}/withdraw/`, which **deletes** the pending payment row **and the proof image from media**, refreshes the invoice to Unpaid, clears the customer pay form (amount / reference / file input), then lets them submit again. The claim disappears from admin Payments.

## Amount

Must match the balance due **exactly** (e.g. $100.00 → only $100.00).

- Too much → “Amount is too much…”
- Too little → “Amount is too little…”

No partial payments on a claim.

## Methods

- **Cash:** customer may open a claim; staff uploads the bill image, then **Verify**.
- **Card / QR / Bank:** customer uploads transaction proof; staff **Verify**.

Proof image and **Received by** (staff) are required before Verify. Without staff selected, the Verify action is blocked.

## Work order gate

Quality check → **Ready for pickup (90%)** only when the linked invoice is fully **Paid** (verified).

- Unpaid → “Customer has not paid this invoice yet.”
- Pending → “Payment is waiting for verification.”
- Completed remains **100%**.

## FKs

- **Invoice:** `repair_job` (work order) is the parent FK. `customer` and `vehicle` are FKs locked to that job. **Booking** is related through the work order (`repair_job.booking`) — not a second invoice FK (avoids conflicting parents). On edit, work order / booking / customer / vehicle are read-only.
- **Payment:** `invoice` is the parent FK. `customer` and `vehicle` are FKs locked to that invoice. On edit they are read-only.
