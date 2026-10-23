Investigate and fix the current authentication problems in my CarSV project.

Production:
- Frontend: https://carsv-web.onrender.com
- API: https://carsv-api.onrender.com
- Authentication provider: Auth0 with Google login
- Branch: `ayheng`

Focus only on the current authentication code, configuration, and behavior related to the issues below. Do not compare with previous code or previous implementations.

## Case 1: Google/Auth0 login and email/password login must access the same account

Google login through Auth0 works successfully, but email/password login rejects the same email address used by Google.

Investigate the actual cause by tracing the current frontend and backend authentication flows, user records, password handling, email normalization, account linking, verification status, and API responses.

Required behavior:
- A user who registers through Google/Auth0 must be able to access the same account through email/password if they have securely established a local password.
- If the user has no local password, provide a secure way to set one or use the password-reset flow.
- Do not assume a Google account automatically has a local password.
- Prevent duplicate accounts and link accounts only after securely verifying ownership of the email.
- Never allow account takeover by linking accounts based only on matching email strings.

## Case 2: Email/password registration must verify the real email

When a user registers through the normal email/password form:
- Send a verification link or a random six-digit verification code to their email address.
- Do not activate the account or allow normal login until verification succeeds.
- Include appropriate expiration, single-use verification, resend rate limiting, and clear frontend messages.
- Ensure password-reset emails are sent to the correctly normalized email address.
- Handle email delivery errors properly without falsely reporting success.
- Never expose passwords, verification tokens, or sensitive data in API responses or logs.

## Case 3: Auth0 email verification and MFA

For Google/Auth0 authentication:
- Validate the Auth0 identity securely on the backend.
- Verify the email using trusted provider claims, including `email_verified`; do not trust an email address supplied only by the frontend.
- Do not treat an unverified email as verified or allow it to bypass required verification.
- If Auth0 requires MFA for the user or authentication policy, require successful completion before granting access.
- If MFA is not enabled or required, do not force the user to enable it.
- Preserve the existing working Google login behavior.

## Investigation and implementation

1. Inspect the current authentication-related frontend, backend, user model, APIs, Auth0 integration, and relevant Render configuration.
2. Trace the exact failure in Case 1 and identify the concrete root cause. Check whether the email/password flow is failing because of a missing local password, user activation, verification status, email normalization, or another issue.
3. Identify any Auth0 or Render settings that must be corrected manually.
4. Implement the minimal necessary code fixes for these cases without redesigning the UI or changing unrelated features.
5. Add or update automated tests for email/password registration and verification, Google/Auth0 login, local password setup/reset, email normalization, secure account linking, unverified emails, and MFA-required flows.
6. Run the relevant Django tests and frontend production build.

## Constraints

- Do not compare the code with previous implementations or rely on old reports.
- Do not disable security checks or bypass verification/MFA to make login work.
- Do not delete, reset, merge, or modify existing production user accounts.
- Do not expose production user data, credentials, tokens, or secrets.
- Do not modify Render settings, deploy, commit, or push.
- Do not change unrelated application features.

After investigating, report the concrete root cause, the files changed, test results, and any manual Auth0/Render configuration I must perform. If a necessary change requires production access or could affect existing accounts, explain it and wait for my approval before taking that action.