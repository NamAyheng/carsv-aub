# CarSV — Critical Production Mobile Auto-Refresh Investigation

We have a serious issue on the LIVE production website.

**Production website:** https://carsv.chayhour.xyz  
**Production API:** https://admin.carsv.chayhour.xyz

## Problem Description

The website works successfully when tested on a PC/desktop browser.

However, when accessing the same live website through a mobile browser, the customer website repeatedly refreshes or reloads automatically.

This happens across multiple areas, including:

- Login and registration.
- Authentication and session handling.
- Customer portal.
- Booking services.
- Multi-step forms and workflows.
- Other customer-facing pages.

Sometimes customers are completing a multi-stage process, but the unexpected refresh interrupts the process, resets their progress, or causes the operation to fail.

This is a production issue and must be investigated carefully.

## 1. Investigate the Root Cause First

Inspect the entire current frontend and backend implementation.

Focus especially on:

- React rendering and component lifecycle.
- `useEffect`, `useState`, and dependency arrays.
- Components being unnecessarily remounted.
- Authentication context and session initialization.
- Access-token expiration and refresh-token rotation.
- API interceptors and repeated 401 retry behavior.
- Cookie configuration (`SameSite`, `Secure`, domain, path).
- CORS and CSRF configuration.
- Route guards and authentication redirects.
- Form submission behavior.
- Buttons that may accidentally trigger form submission.
- Navigation and page reload logic.
- Local/session storage usage.
- API requests repeatedly triggering state changes.
- Mobile browser compatibility.

Inspect `client.ts`, authentication components, routing, portal components, booking components, and all relevant shared hooks and layouts.

## 2. Investigate Mobile-Specific Behavior

Test and inspect differences between:

- Desktop Chrome.
- Android Chrome.
- Android Firefox.
- iOS Safari, if supported.

Check whether the issue is caused by:

- Mobile browser cookie restrictions.
- Cross-origin refresh cookies.
- Browser page lifecycle or visibility events.
- Back-forward cache behavior.
- Network interruptions or repeated API requests.
- Mobile-specific event handlers.
- Viewport or responsive rendering causing component remounts.

Do not assume that every mobile browser has the same behavior.

## 3. Authentication and Session Stability

Verify that:

1. Opening the website does not repeatedly initialize authentication.
2. Login does not trigger repeated refresh requests.
3. An expired access token triggers only one appropriate refresh attempt.
4. Multiple simultaneous API requests do not create refresh-token rotation conflicts.
5. Failed refresh requests do not cause an infinite redirect/reload loop.
6. Unauthenticated users are redirected correctly.
7. Authenticated customers remain authenticated while navigating the portal.
8. Refreshing the page manually does not create a repeated reload cycle.

Preserve the existing security protections.

## 4. Multi-Step Workflow Stability

Inspect all customer workflows that use multiple steps.

Ensure that:

- React state is not unexpectedly reset.
- Forms do not submit unintentionally.
- Clicking Next, Back, Continue, or other action buttons does not reload the page.
- API requests do not trigger unnecessary full-page navigation.
- Users do not lose their progress because of component remounting.
- Duplicate submissions are prevented.
- Successful API responses do not cause repeated navigation.

Preserve the existing business logic and UI design.

## 5. Production Debugging

Use the available production configuration and safe testing methods.

Inspect:

- Browser console errors.
- Network request sequences.
- API response statuses.
- Repeated requests.
- Redirect chains.
- Authentication cookies.
- React rendering behavior.

If live testing is unavailable, explain exactly what needs to be tested manually and how to reproduce the issue.

Do not claim that mobile production behavior is fixed without evidence.

## 6. Fixing Rules

After identifying the root cause:

- Fix the actual cause rather than adding random delays or reload workarounds.
- Preserve all existing desktop functionality.
- Preserve the existing mobile UI design.
- Preserve authentication security.
- Preserve booking and other business workflows.
- Avoid unnecessary architecture changes.
- Do not disable token expiration, verification, or refresh security.
- Do not introduce polling or automatic page reloads as a workaround.

## 7. Testing

After making necessary fixes:

- Run frontend TypeScript checks.
- Run the frontend production build.
- Run relevant backend tests if backend code changes.
- Test authentication and refresh behavior.
- Test customer portal navigation.
- Test booking and multi-step forms.
- Check for repeated API requests and unexpected navigation.

Provide a clear list of what was tested on desktop and mobile.

## 8. Restrictions

- Do not reset or delete the production database.
- Do not delete local database or media files.
- Do not modify production data.
- Do not change Render environment variables without approval.
- Do not deploy automatically.
- Do not commit or push automatically.
- Do not modify unrelated features.

## Final Report

Create `docs/CarSV_Mobile_Auto_Refresh_Investigation.md`.

Include:

1. Root cause(s).
2. Exact files and components responsible.
3. Why desktop works but mobile fails.
4. Network/API/authentication findings.
5. Changes made.
6. Tests performed and actual results.
7. Remaining problems.
8. Manual mobile testing instructions.
9. Whether the changes are ready for production deployment.

**Priority: Find and fix the underlying cause of unexpected mobile page reloads without breaking the existing desktop website or customer workflows.**