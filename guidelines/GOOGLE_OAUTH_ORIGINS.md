# Google Sign-In origins (CarSV)

Keep Google GIS working on both the custom domain and the Render fallback.

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **OAuth 2.0 Client ID** (Web):

## Authorized JavaScript origins

Add (do not remove existing working origins during cutover):

- `https://carsv.chayhour.xyz`
- `https://carsv-web.onrender.com`
- `http://127.0.0.1:3000` (local)
- `http://localhost:3000` (local)

## Authorized redirect URIs

Only required if you use a redirect-based OAuth flow. CarSV customer Google sign-in uses GIS ID tokens against the API; if the client already has redirect URIs for onrender, leave them. Add the custom site only if Google Console requires it for your client type:

- `https://carsv.chayhour.xyz`
- `https://carsv-web.onrender.com`

The browser `GOOGLE_CLIENT_ID` on Render does not need to change when only origins are updated.
