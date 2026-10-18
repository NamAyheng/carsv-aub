# CarSV Telegram alert message style

**Chosen style:** your emoji + labeled layout, written in **customer language**.

Why this wins over plain text or the older drafts:
- **Emoji headers** make the type obvious while scrolling Telegram
- **Labeled lines** (car, service, amount) are easy to scan
- **Customer wording** (“your car”, “waiting for your OK”) instead of garage jargon
- **Account line** so multi-account users know who the alert is for

One account ↔ one Telegram. Soften staff words: no “work order”, “fulfillment”, “Part ID” — use plain English.

---

## Shared layout

```
[emoji] CarSV · [Title]
👤 [Customer name]

🚗 Car: …
🔧 Service: …     (when relevant)
…other useful lines…

[1–2 short lines: what this means for you]
[What you can do next, if needed]
```

### Rules

- One emoji in the **title**; keep field emojis consistent (car, service, money)
- Always include **👤 name**
- Lead details with **car + service** when it’s about a visit
- End with a clear next step only when the customer must act
- One topic per message
- Optional divider `━━━━━━━━━━━━━━━━━━` only if sending a digest of several alerts; **normal alerts = no divider**

### Field emoji map (keep consistent)

| Field    | Emoji |
|----------|-------|
| Account  | 👤 |
| Car      | 🚗 |
| Service  | 🔧 |
| When     | 🕒 |
| Part     | 📦 |
| Quote / invoice / payment # | 🧾 or 🆔 |
| Amount   | 💵 |
| Method   | 💳 |
| Status   | 📍 or ⏳ |
| Next / tip | 👉 |

---

## Link flow (bot)

### Confirm link

```
🔗 CarSV · Confirm link

Link this Telegram chat to:

👤 Ching ChayHour
📧 hhour41251@gmail.com
📱 +855885831366

Is this your account?

✅ Yes, link account
❌ Cancel
```

### Linked successfully

```
✅ CarSV · Telegram linked

👤 Ching ChayHour
📧 hhour41251@gmail.com

🔔 Alerts for this account will arrive here only.

Wrong account? Disconnect in CarSV Profile first.
```

### Connect blocked (already linked to someone else)

```
🚫 CarSV · Connect blocked

This Telegram is already linked to:
👤 Ayheng Nam

That link stays active.
To connect another CarSV account, use a different Telegram
(or ask them to Disconnect in Profile first).
```

---

## Garage alerts (chosen examples)

### Vehicle added

```
🚗 CarSV · Vehicle added
👤 Hour

🚗 2JJ-3431 — Toyota Camry (2000)

Your car is now on your account. You can book a visit anytime.
```

### Booking received (includes extras + parts when present)

```
📅 CarSV · Booking received
👤 Hour

🚗 Car: 2JJ-3431
🔧 Main service: Battery replacement
🛠️ Extra services: Transmission service
📦 Parts: Transmission gear set
🕒 When: 31 Oct 2026 · 08:45

We got your booking. It’s waiting for the garage to confirm.
We’ll message you when it’s set.
```

### Booking confirmed

```
✅ CarSV · Booking confirmed
👤 Hour

🚗 Car: 2JJ-3431
🔧 Main service: Battery replacement
🛠️ Extra services: Transmission service
📦 Parts: Transmission gear set
🕒 When: 31 Oct 2026 · 08:45

Your booking is confirmed.
Please bring your car at the scheduled time.
```

### Profile updated (shows what changed)

```
👤 CarSV · Profile updated
👤 Hour

✏️ Phone: +855111 → +855222
✏️ Address: (empty) → Phnom Penh

Your account details were updated.
```

### Vehicle updated (shows what changed)

```
🚗 CarSV · Vehicle updated
👤 Hour

🚗 2JJ-3431 — Toyota Camry (2000)
✏️ Color: White → Black
✏️ Mileage: 50000 → 51200

Your vehicle details were updated.
```

### Part added to visit

```
📦 CarSV · Part added
👤 Hour

🚗 Car: 2JJ-3431
🔧 Main service: Battery replacement
🛠️ Extra services: Transmission service
📦 Parts: Transmission gear set
🆔 Request: PR-0027
✏️ Added part: Transmission gear set

This part was added to your visit.
The garage will prepare it when your car is in.
```

### Car checked in

```
🚘 CarSV · Car checked in
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

Your car is checked in. The team has started looking after it.
Follow progress anytime in Tracking.
```

### Invoice ready

```
🧾 CarSV · Invoice ready
👤 Hour

🚗 Car: 2JJ-3431
🧾 Invoice: INV-BK-0036

Your bill is ready.
👉 Pay at the garage, or from Invoices in your account.
```

### Approval required (quote)

```
📋 CarSV · Approval needed
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

We need your OK before continuing.
👉 Open Quotes or Tracking to review and approve or decline.
```

### Quote ready (with amount — preferred when amount is known)

```
📋 CarSV · Quote ready
👤 Hour

🚗 Car: 2JJ-3431
🧾 Quote: QT-0042
💵 Amount: $85.00

Please review the price before we continue.
👉 Open Quotes to approve or decline.
```

### Service added to visit

```
🔧 CarSV · Service added
👤 Hour

🚗 Car: 2JJ-3431
🛠️ Service: Transmission service

This service was added to your current visit.
```

### Repair confirmed (after you approved)

```
✅ CarSV · Repair continuing
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

Thanks — you’re all set. The workshop will continue the repair.
```

### Part confirmed (on the bill)

```
⚙️ CarSV · Part confirmed
👤 Hour

📦 Part: Gearbox shaft assembly
🧾 Invoice: INV-BK-0036

This part is confirmed on your visit.
💰 Any remaining balance is due at the garage.
```

### Tracking updated

```
📍 CarSV · Tracking update
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement
📍 Status: Quality check

Your visit status was updated. Open Tracking for details.
```

### Payment submitted

```
💳 CarSV · Payment submitted
👤 Hour

🧾 Invoice: INV-BK-0036
🆔 Payment: PAY-0023
💵 Amount: $1,275.00
💳 Method: QR payment

We received your payment. The garage is checking it.
We’ll message you when it’s confirmed.
```

### Payment verified

```
✅ CarSV · Payment accepted
👤 Hour

🧾 Invoice: INV-BK-0036
🆔 Payment: PAY-0023
💵 Amount: $1,275.00
💳 Method: QR payment

Your payment was accepted. Thank you!
```

### Payment not accepted

```
❌ CarSV · Payment not accepted
👤 Hour

🧾 Invoice: INV-BK-0036
🆔 Payment: PAY-0023

Sorry — the garage could not accept this payment.
👉 Please try again, or contact the front desk.
```

### Ready for pickup

```
🎉 CarSV · Ready for pickup
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

Good news — your car is ready!
Please come to the garage when you can.
```

### Visit completed

```
🏁 CarSV · Visit completed
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

Your service is finished.
🧾 Collect your bill at the garage, or pay from Invoices in your account.
```

### Visit cancelled

```
🚫 CarSV · Visit cancelled
👤 Hour

🚗 Car: 2JJ-3431
🔧 Service: Battery replacement

This visit was cancelled. The repair will not continue.
If you still need help, contact the garage or book again.
```

---

## What we kept vs changed from your samples

| Kept (good) | Improved |
|-------------|----------|
| Emoji title + labeled fields | Softer customer copy (“your car”, “waiting for your OK”) |
| Numbers: invoice, payment, part request | Drop “work order opened” → say what it means for you |
| Date / amount / method lines | Always add **👤 name** |
| Celebrate ready / completed | “Payment verified” → **Payment accepted** (clearer for customers) |
| Confirm-link Yes/No buttons | Blocked-link message when Telegram already taken |

---

## Action needed vs FYI

| Needs you | Just so you know |
|-----------|------------------|
| Approval needed / Quote ready | Checked in, tracking, repairing |
| Payment not accepted | Payment accepted |
| Invoice ready (if unpaid) | Booking confirmed, ready for pickup |

---

## Implement first

1. Visit: checked in → approval → ready → completed  
2. Quote / approval needed  
3. Payment submitted / accepted / not accepted  
4. Booking received / confirmed  

---

## Coding notes (later)

- One formatter: `{emoji} CarSV · {title}` + `👤 {name}` + labeled body + short meaning
- In-app notification titles can stay shorter; Telegram uses this layout
- Do not spam dividers on single alerts
- English first; bilingual later if needed
