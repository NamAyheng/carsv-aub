# CarSV — Complete Customer Website Responsive UI Enhancement

## Objective

Improve the existing CarSV customer website so it looks polished, modern, and easy to use on mobile phones and iPads.

The desktop/PC design is already good and must remain visually unchanged. Focus exclusively on improving responsive layouts, spacing, navigation, readability, and usability on smaller screens.

**This is a responsive enhancement, not a website redesign.** Inspect the existing implementation, identify real problems, and improve the current UI without breaking any functionality.

## 1. Strict Scope

The project has two interfaces:

- **Customer website:** React 19, TypeScript, Vite 6, Tailwind CSS 4, and React Router 7.
- **Staff/admin console:** Django Unfold at `/admin/`.

Work exclusively on the customer website under `web-frontend/`, especially `web-frontend/src/components/customer/`, and inspect related shared frontend components, styles, routes, and layouts when necessary.

Rules:
- Do not modify Django admin templates, admin CSS, staff interfaces, backend APIs, database models, or business logic.
- Do not rebuild the website or replace the existing design system.
- Preserve the current branding, including the yellow accent `#ffc400` and dark `#141519`.
- Keep all existing features, authentication, routing, API integration, permissions, and customer workflows working.
- Do not introduce mock data, duplicate components, unnecessary dependencies, or unrelated changes.

## 2. Most Important Requirement: Preserve Desktop UI

Treat the current desktop version as the approved design.

At desktop widths, preserve the existing:
- Page layouts and section ordering
- Header, navigation, and footer
- Colors, typography, font sizes, and visual hierarchy
- Component dimensions, spacing, padding, and margins
- Card grids, forms, buttons, and modals
- Animations, hover effects, and interactions

Implement responsive changes using appropriately scoped responsive utilities, CSS media queries, and existing project conventions.

Do not casually rewrite shared styles, global CSS, or base components if doing so could change the desktop appearance. Avoid broad CSS overrides and conflicting breakpoint rules.

Use the current desktop screenshots or browser rendering as a baseline. After making changes, compare the desktop version against that baseline and fix any unintended visual differences.

## 3. Audit Every Customer-Facing Page

Inspect the actual routes and implementations before changing code.

### Public website
- `/` — Homepage
- `/about` — About
- `/services` — Service catalog
- `/how-it-works` — Process explanation
- `/live-bay` — Live bay information
- `/blog` — Articles and content
- `/contact` — Contact information
- `/verify-email` and `/reset-password` — Authentication-related pages

### Customer portal
- `/dashboard` — Customer overview
- `/vehicles` — Vehicle management
- `/appointments` — Booking history and booking modal
- `/tracking` — Repair progress
- `/quotes` — Quotation review and approval
- `/parts` — Parts catalog and requests
- `/invoices` — Bills and payment claims
- `/documents` — Customer documents
- `/reviews` — Feedback
- `/notifications` — Notifications
- `/profile` — Account management

Use the actual route configuration and existing components as the source of truth. Some routes may share components or layouts.

For every page, identify:
- Horizontal overflow and clipped content
- Inappropriate fixed widths or heights
- Overcrowded sections and inconsistent spacing
- Cards and grids that do not adapt to screen size
- Navigation that does not fit smaller screens
- Forms, dialogs, dropdowns, and buttons that are difficult to use
- Text that is too small, wraps badly, or overlaps
- Tables and data sections that become unreadable
- Responsive issues caused by images, long text, or dynamic content

Do not stop after auditing. Implement the necessary improvements throughout the customer website.

## 4. Mobile and Tablet Design Improvements

### A. Overall layout

- Use the available viewport width effectively.
- Convert multi-column layouts into single-column layouts when necessary.
- Keep appropriate multi-column layouts on larger tablets where space allows.
- Adjust padding, margins, gaps, card widths, and typography at suitable breakpoints.
- Prevent accidental horizontal scrolling, overlapping elements, and clipped content.
- Avoid excessive empty space, unnecessarily tall cards, and oversized mobile sections.
- Use flexible widths, `min-width: 0`, appropriate `max-width` values, and content-aware sizing where needed.
- Handle long booking references, vehicle registration numbers, service names, prices, and status labels safely.
- Keep images proportional and prevent layout shifts or stretching.

### B. Header and navigation

Preserve the existing desktop header and navigation.

On smaller screens:
- Adapt the navigation into a suitable mobile menu when necessary.
- Prevent the logo, navigation links, and action buttons from overlapping.
- Ensure the menu opens and closes reliably with touch input.
- Make menus accessible by keyboard and screen readers.
- Prevent dropdowns from extending beyond the viewport.
- Ensure authenticated customers can navigate the portal comfortably.
- Keep important actions accessible without overcrowding the header.

If the project uses a shared header or navigation component, scope responsive changes carefully so the desktop rendering remains unchanged.

### C. Dashboard and cards

For the customer dashboard, vehicles, appointments, invoices, notifications, and other card-based pages:
- Adapt grid columns and card widths to the viewport.
- Keep titles, descriptions, dates, prices, and statuses readable.
- Prevent buttons and badges from overflowing card boundaries.
- Align action buttons consistently.
- Stack content vertically when horizontal layouts become cramped.
- Preserve useful information rather than hiding it simply to save space.
- Ensure loading, empty, and error states are responsive too.

### D. Forms and customer account pages

For login, registration, profile editing, vehicle management, password reset, and other forms:
- Use appropriately sized fields that fit the viewport.
- Stack labels and inputs when necessary.
- Keep validation messages visible and prevent them from overlapping other fields.
- Ensure buttons remain accessible when the mobile keyboard is open.
- Make dropdowns, date pickers, and other controls touch-friendly.
- Ensure dialogs fit the viewport and their content can scroll when necessary.
- Preserve existing validation, authentication, and submission behavior.

## 5. Protect the Core CarSV Workflows

Responsive improvements must support real customer tasks, not just make the pages look good.

### A. Service booking — `/appointments`

The booking process supports multiple services and inventory parts across multiple stages.

Ensure customers can:
- Browse and select multiple services comfortably.
- Browse and add parts, including selecting quantities where supported.
- See selected items, prices, and totals clearly.
- Add or remove eligible selections without misclicking.
- Navigate between booking stages without losing their selections.
- Complete vehicle selection, forms, validation, and booking confirmation.
- Review their booking details on smaller screens.

Make stage indicators, progress navigation, selection lists, quantity controls, and action buttons responsive.

Avoid placing essential actions outside the visible content area or creating a layout that requires awkward horizontal scrolling.

### B. Quotes and inspection recommendations — `/quotes`

Ensure the quotation page presents the existing information clearly on mobile:
- Original booked services and parts
- Customer-added extra services and parts
- Inspector-recommended extra services and parts
- Inspection findings and recommendation notes
- Item quantities, prices, and quotation totals
- Available quote approval and decline actions
- Controls for removing eligible extra items

Use clear section separation and stack information vertically when appropriate.

Preserve the existing source rules: original `BOOKING` items must not become removable through the recommended-extras interface, while eligible customer-added and inspector-recommended extras retain their existing behavior.

Do not change quotation calculations, approval rules, or backend behavior.

### C. Repair tracking — `/tracking`

- Make repair progress and status indicators readable on narrow screens.
- Adapt horizontal timelines or step indicators when they no longer fit.
- Present work-order details, vehicle information, and status descriptions clearly.
- Keep important status information visible without forcing the entire page to scroll horizontally.

### D. Parts, invoices, and payments

- Make part catalogs and part-request forms responsive.
- Keep prices, quantities, availability, and request actions readable.
- Present invoice line items and totals clearly on mobile.
- Ensure payment instructions, proof-upload controls, and payment statuses remain accessible.
- Preserve the existing API behavior, file uploads, and payment workflows.

### E. Documents, reviews, and notifications

- Make document lists, upload controls, and previews fit smaller screens.
- Adapt review forms and rating controls for touch interaction.
- Ensure notification titles, timestamps, descriptions, and actions wrap properly.
- Handle long content without causing horizontal overflow.

## 6. Tables, Dialogs, and Interactive Components

Do not simply shrink desktop components to fit mobile screens.

For data-heavy layouts, choose the most appropriate responsive presentation:
- Controlled horizontal scrolling for genuinely tabular data
- Stacked cards for item-based information
- Responsive columns for forms and summaries
- Compact layouts that retain essential information and actions

For modals and dialogs:
- Apply viewport-aware maximum widths and heights.
- Prevent content from being cut off.
- Allow long content to scroll inside the dialog.
- Keep important action buttons accessible.
- Prevent background scrolling issues where applicable.
- Ensure dropdowns and popovers remain inside the viewport.

Maintain accessible focus states, keyboard interaction, touch targets, and existing functionality.

## 7. Responsive Implementation Standards

- Follow the existing React, TypeScript, and Tailwind CSS 4 conventions.
- Inspect the existing configuration before adding or changing breakpoints.
- Reuse current design tokens and components wherever practical.
- Prefer small, targeted changes over large component rewrites.
- Use content-driven breakpoints rather than assuming every phone or tablet has the same dimensions.
- Avoid hardcoded viewport heights that cause mobile browser problems.
- Avoid `overflow-x: hidden` as a blanket fix for broken layouts; identify and correct the actual source of overflow.
- Avoid unnecessary duplication of mobile and desktop components.
- Keep responsive styles maintainable and consistent across pages.
- Do not remove information or features to make a layout appear simpler.

## 8. Testing and Regression Checks

Test the actual customer website at these representative viewport widths:

| Device category | Widths |
|---|---|
| Small mobile | 320px, 360px |
| Standard mobile | 375px, 390px |
| Large mobile | 430px |
| Tablet | 768px, 820px |
| Desktop regression | 1024px, 1280px, 1440px, 1920px |

Also test tablet portrait and landscape orientations.

Use browser screenshots and actual page interactions wherever the available environment supports them. Inspect the rendered website, not only the CSS source.

Verify:
- No unintended horizontal overflow.
- No overlapping or clipped content.
- All navigation menus and dropdowns work.
- Forms and modals fit the viewport.
- Buttons and controls are usable with touch.
- Booking selections persist correctly between stages.
- Quotations and recommended extras display correctly.
- Authentication, API calls, and other customer workflows remain functional.
- The desktop appearance remains consistent with the original.
- No admin files or staff interfaces were modified.

Run the available linting, TypeScript checks, build, and relevant tests. Do not claim visual verification if browser-based testing was not available.

## 9. Execution Plan

1. Inspect the frontend structure, routes, shared layouts, Tailwind configuration, and existing responsive styles.
2. Establish a baseline of the current desktop appearance.
3. Audit every public and portal page for actual responsive issues.
4. Prioritize shared layout problems and high-impact customer workflows.
5. Implement improvements in manageable groups of related components.
6. Test mobile and tablet layouts while checking desktop regressions.
7. Run the available build and code-quality checks.
8. Review the final changes and report the files modified, improvements made, tests completed, and remaining issues.

**Final acceptance criteria:** The existing CarSV customer website should retain its approved desktop appearance while providing a polished, readable, touch-friendly experience on phones and iPads. All current customer features and workflows must continue working, and the Django admin website must remain untouched.

Do not stop after creating a report or making a few sample fixes. Complete the responsive improvements across the entire customer-facing frontend.