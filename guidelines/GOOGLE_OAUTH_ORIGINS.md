# Google Sign-In origins (CarSV)

This is **Google Identity Services (GIS)** — not Auth0. Keep GIS working on **live and local** with the **same** OAuth Web client ID (`GOOGLE_CLIENT_ID`).

**Error 400: `origin_mismatch`** means the browser’s page origin is **not** listed under Authorized JavaScript origins (exact match, no trailing slash, no path). Code cannot add Console origins for you.

Full local auth checklist: [LOCAL_AUTH.md](LOCAL_AUTH.md).

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **OAuth 2.0 Client ID (Web)**:

## Authorized JavaScript origins

Add **all** of these (do not remove working ones):

- `https://carsv.chayhour.xyz`
- `https://carsv-web.onrender.com`
- `http://127.0.0.1:3000` (local — prefer this host)
- `http://localhost:3000` (local)

Open the customer site with the **same** host you registered (prefer `https://carsv.chayhour.xyz` live, `http://127.0.0.1:3000` local). Mixing `localhost` vs `127.0.0.1` causes `origin_mismatch`.

## Authorized redirect URIs

GIS ID-token sign-in usually does not need redirect URIs. If the client already has onrender redirects, leave them; add custom hosts only if Console requires them:

- `https://carsv.chayhour.xyz`
- `https://carsv-web.onrender.com`

## Same email = same CarSV account

Backend links Google `sub` to the existing customer row when the Google email matches (case-insensitive). Form password login uses that same user. Google-only accounts with no password yet: use **Forgot password** (or set password in Profile) before email/password login.

## Frontend note

The app uses classic GIS (`use_fedcm_for_prompt: false`) so Firefox is less likely to hit FedCM/`origin_mismatch` when origins are correctly listed.
