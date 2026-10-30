# Cloudflare DNS for CarSV (hour04)

Domain owner: Cloudflare account for **chayhour.xyz** (GitHub: `hour04`).  
Render owner: `namayheng`.

After you save these records, tell **namayheng** so they can verify Resend + Render custom domains.

Use **DNS only** (gray cloud) for the two Render CNAMEs unless Render’s dashboard says otherwise. Do **not** delete unrelated records for `chayhour.xyz`.

---

## 1. Point the website and admin at Render

| Type | Name (Cloudflare) | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `carsv` | `carsv-web.onrender.com` | DNS only (gray) |
| CNAME | `admin.carsv` | `carsv-api.onrender.com` | DNS only (gray) |

Resulting hostnames:

- Customer site → `https://carsv.chayhour.xyz`
- Admin / API → `https://admin.carsv.chayhour.xyz` (admin UI at `/admin/`)

Remove any **AAAA** (IPv6) records for these same names if they exist.

---

## 2. Resend email (so every customer gets verification mail)

Add these under zone **chayhour.xyz** (Resend domain `carsv.chayhour.xyz`):

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.carsv` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD6wmi0mxPe5AgY1FS92mIcj+0RuU0oX6v2fqT9JMrV+vpf1CNuwxILZ2Tt57Q51rlOrHnTq3MHGNPnJgh0AhxJOzeCrfjiAQ2cnzNCRsgcjv6MC8HcDVmEaxcYwFnqQvYGtazfwYdVFzTwZEKVhrWEoHVpZ0VzwZP7XifULOXSVwIDAQAB` | — |
| MX | `send.carsv` | `feedback-smtp.us-east-1.amazonses.com` | **10** |
| TXT | `send.carsv` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend.carsv` | `send.forge.rmta.net` | — |

TTL: Auto is fine.

---

## 3. Done checklist

- [ ] Both Render CNAMEs saved  
- [ ] All four Resend records saved  
- [ ] Message namayheng: “Cloudflare DNS for CarSV is ready”

Namayheng then verifies Resend, attaches custom domains on Render, and updates Google OAuth origins.
