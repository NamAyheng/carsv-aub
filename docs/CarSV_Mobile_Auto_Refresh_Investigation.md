# CarSV — Mobile Auto-Refresh Investigation

**Status:** Code fixes applied locally. **Not deployed** (no auto-commit / auto-deploy per brief).  
**Production site:** https://carsv.chayhour.xyz  
**Production API:** https://admin.carsv.chayhour.xyz  
**Brief:** [guidelines/update-mobile-issue.md](../guidelines/update-mobile-issue.md)

---

## 1. Root cause(s)

There is **no** `location.reload`, meta-refresh, or service worker in the customer frontend. Reported “auto-refresh” on mobile was mainly:

### A. Full portal remount on every tab change — **fixed**

Sibling portal routes each mounted a new `CustomerPortalApp` with `key={tab}`, destroying booking/modal state on every tab switch.

### B. Auth bounce when session cannot be restored — **unchanged (env / device)**

Access JWT is memory-only; survival depends on HttpOnly `carsv_refresh` on `admin.carsv.chayhour.xyz`. Failed refresh → `RequireCustomer` → `/?signin=1`. Confirm Render cookie env (`DJANGO_COOKIE_SECURE=1`, `DJANGO_REFRESH_COOKIE_SAMESITE=None`) and real-device cookie jar after deploy of unrelated work.

### C. Broken public catalog fetches on the static host — **fixed**

Relative `/api/public/*` hit the Static Site SPA rewrite (HTML). Now uses `VITE_API_URL`.

### D. Auth modal remount on Login ↔ Register — **fixed**

Removed `key={authMode}`; mode syncs on open without wiping an in-progress OTP step.

---

## 2. Exact files / components

| Area | Path |
| --- | --- |
| Portal layout (stay mounted) | `web-frontend/src/App.tsx` |
| Auth modal mode sync | `web-frontend/src/components/customer/CustomerAuthModal.tsx` |
| Public services URL | `web-frontend/src/api/garage.ts` |
| Public blog URL | `web-frontend/src/api/blog.ts` |
| Auth gate / bootstrap (unchanged) | `App.tsx` `RequireCustomer`, `AppContext.tsx`, `client.ts` |

---

## 3. Why desktop can look fine while mobile fails

Mobile users hit tab switches, backgrounding, and deep links more often; remounts and cookie/session gaps show up as “refresh.” Desktop often keeps one tab and an in-memory access token.

---

## 4. Network / API / auth findings (live)

- CORS refresh preflight from `https://carsv.chayhour.xyz`: OK + credentials.  
- `carsv.chayhour.xyz/api/public/services/` previously returned HTML; admin host returns JSON.  
- Cookie presence on real phones: still verify after deploy.

---

## 5. Changes made

1. **Portal layout route** — pathless parent `CustomerPortalShell` wraps all portal paths so `CustomerPortalApp` stays mounted; tab UI still driven by `pathname` / `tabForPath`.  
2. **Public API base** — `loadPublicServices` / `loadPublicBlog` call `${VITE_API_URL}/api/public/...`.  
3. **Auth modal** — drop remount key; sync `initialMode` on open; preserve `CHECK_EMAIL` / `PHONE` / `FORGOT` if parent toggles Login/Register while open.

---

## 6. Tests performed and results

| Test | Result |
| --- | --- |
| Code search for hard reload / PWA | None |
| Live static vs admin public services (pre-fix) | Static HTML bug confirmed |
| `npm run build` (web-frontend) | Pass |
| Physical Android/iOS after deploy | **Not yet** |

---

## 7. Remaining problems

- Live site still runs the **old** bundle until you deploy the Static Site.  
- Confirm refresh cookie on mobile after login.  
- Manual booking + OTP + portal tabs on a phone after deploy.

---

## 8. Manual mobile testing instructions

1. Deploy frontend (Static Site) with these changes; keep `VITE_API_URL=https://admin.carsv.chayhour.xyz`.  
2. Phone → https://carsv.chayhour.xyz — Network: public services/blog hit **admin** and return JSON.  
3. Sign in → open booking → switch portal tabs — booking modal should **not** reset solely from tab change.  
4. Register → OTP step → do not lose the step when toggling chrome around the modal.  
5. Hard reload while signed in → stay signed in if `carsv_refresh` is present.

---

## 9. Ready for production deployment?

**Code is ready to deploy** after your usual review. This agent did **not** commit or deploy. Approve a Static Site deploy when you want it live; then run the mobile checklist in §8.
