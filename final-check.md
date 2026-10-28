# CarSV — Full Project Audit (Everything, End to End)

The CarSV project is now considered feature-complete. I want you to perform a **FULL, COMPREHENSIVE AUDIT OF THE ENTIRE PROJECT** based on the current repository.

Do not focus only on recent changes, deployment, authentication, or a few important files. Inspect the whole project, from the frontend to the backend, database, integrations, infrastructure, tests, documentation, and production configuration.

Your goal is to determine whether the entire application is correctly implemented, connected, secure, consistent, and ready for final academic submission and demonstration.

## 1. Audit the entire repository

Start by inspecting the current Git branch, working-tree status, repository structure, and all relevant project files.

Inspect every relevant source file and configuration, including:

- Frontend pages, components, layouts, routing, forms, state management, hooks, utilities, styling, and assets.
- Backend applications, models, serializers, views, APIs, services, permissions, validators, middleware, signals, management commands, and utilities.
- Database models, relationships, constraints, migrations, indexes, and database configuration.
- Authentication and authorization, including email/password, email verification, password reset, Google/Auth0, Telegram, MFA behavior, account linking, sessions, tokens, and cookies.
- Every major business feature and its complete user workflow.
- Frontend-to-backend API connections and backend-to-database operations.
- File uploads, downloads, image paths, public media, private media, and access controls.
- Dockerfiles, Docker Compose, entrypoint scripts, environment variables, and local development setup.
- Render production configuration, deployment documentation, static assets, database connectivity, and startup behavior.
- Resend email delivery and all other external integrations.
- Automated tests, fixtures, sample data, seed commands, dependency files, and build configuration.
- Existing documentation and project requirements.

Do not skip a subsystem simply because the repository is large. Divide the audit into logical areas and continue until every relevant area has been examined.

Do not waste time inspecting generated dependencies or build outputs line by line. Focus on application-owned code and configuration, while checking that generated files and dependencies are correctly excluded from version control.

## 2. Verify every feature end to end

For every implemented feature, trace the complete flow:

1. What the user sees and does in the frontend.
2. Form validation and state handling.
3. API request, HTTP method, URL, headers, and payload.
4. Backend routing, authentication, permissions, and validation.
5. Business logic and error handling.
6. Database reads, writes, relationships, and constraints.
7. API response and frontend state updates.
8. Loading, empty, success, failure, and unauthorized states.
9. Role-specific behavior and data access restrictions.
10. Relevant automated tests.

Identify features where the frontend looks complete but the backend is missing, data is mocked, API calls are disconnected, database relationships are incorrect, or error handling is incomplete.

Verify all relevant user roles and workflows against the actual implementation. Do not assume that a button, page, API route, or database model proves that a feature works.

## 3. Audit the complete frontend

Check:

- Routing, navigation, protected routes, redirects, and refresh behavior.
- All pages and components for runtime errors and broken interactions.
- Forms, validation, error messages, loading indicators, and duplicate submissions.
- API client configuration, base URLs, authentication headers, cookies, and credential handling.
- Environment-variable usage and production build configuration.
- API response parsing, null/empty values, pagination, filtering, and state consistency.
- Image URLs, missing assets, broken links, and upload previews.
- Responsive layout, accessibility basics, and visible UI inconsistencies.
- Console errors, incorrect assumptions about API responses, and unhandled exceptions.
- Production behavior when the API is slow, unavailable, or returns an error.

Identify duplicate components, dead code, unused dependencies, hardcoded data, and inconsistent patterns where they materially affect correctness or maintainability.

## 4. Audit the complete backend

Check:

- Every URL route, API endpoint, HTTP method, request field, and response format.
- Authentication, authorization, ownership checks, role permissions, and object-level access.
- Model validation, database constraints, relationships, and transaction handling.
- Business rules, status transitions, duplicate submissions, and invalid state changes.
- Error handling, HTTP status codes, logging, and exception handling.
- File upload validation, size/type restrictions, storage, download permissions, and private-media protection.
- Email delivery, verification tokens, expiry, resend limits, and password-reset security.
- External integration failures, timeouts, invalid responses, and configuration errors.
- N+1 queries, obvious performance problems, and unsafe database operations.
- Management commands, startup scripts, migrations, and seed behavior.

Verify that security-sensitive operations are enforced by the backend, not only by frontend controls.

## 5. Audit all authentication methods together

Check email/password, Google through Auth0, and Telegram as one account system.

Verify:

- Registration, login, logout, email verification, password reset, and password setup.
- Consistent email normalization and uniqueness.
- Correct handling of verified and unverified email addresses.
- Auth0 token validation and trusted identity claims.
- Telegram identity verification and account-linking protections.
- Safe linking and unlinking of authentication providers.
- Prevention of duplicate accounts and account takeover.
- Correct access-token and refresh-token lifecycle.
- Cookie settings, CORS, CSRF, HTTPS, and cross-origin browser behavior.
- MFA requirements when configured by the identity provider.
- Behavior when an account uses multiple login methods.
- Existing-account compatibility and failure recovery.

Do not weaken security to make a login flow pass. Do not assume that Google, Telegram, and local credentials automatically share one account. Confirm that the current implementation supports this securely.

## 6. Audit the database and business workflows

Inspect every model and migration. Confirm that the actual relationships and constraints support the intended application workflows.

Trace relevant workflows from creation through completion, cancellation, and other permitted transitions. Check for:

- Missing foreign keys or incorrect relationships.
- Orphaned records, duplicate data, invalid status transitions, and race conditions.
- Missing validation and constraints.
- Incorrect deletion behavior or unintended cascading deletes.
- Inconsistent calculations, totals, availability, or status updates.
- Data that is created but never used, or displayed without being persisted.
- Differences between local SQLite behavior and production PostgreSQL behavior.
- Migrations that fail on a fresh database or an existing database.
- Seed commands that create duplicates or damage existing records.

Use the official project requirements and actual code to determine expected behavior. Do not invent business rules.

## 7. Audit Docker and local development

Verify:

- Dockerfile build contexts, dependency installation, working directories, startup commands, and exposed ports.
- Docker Compose service definitions, networks, health checks, environment variables, and dependency ordering.
- Database readiness and migration behavior.
- Persistent volumes and media mounts.
- Frontend/backend connectivity inside and outside Docker.
- Correct separation between development and production settings.
- Startup, restart, stop, rebuild, and recovery procedures.
- Whether a fresh clone can be configured and started using the documented instructions.

Use safe inspection and build/test commands. Do not run destructive cleanup commands or remove Docker volumes.

## 8. Audit Render production deployment

Inspect the current deployment-related code and documentation for:

- Frontend Static Site build and publish configuration.
- API Docker build and `$PORT` handling.
- PostgreSQL connection configuration and migrations.
- Required and optional environment variables.
- Production hosts, HTTPS, CORS, CSRF, and cookie configuration.
- SPA rewrites and direct navigation to frontend routes.
- Static files, catalog images, private uploads, and media URL signing.
- Resend API configuration and sender-domain verification requirements.
- Admin bootstrap behavior and demo seed flags.
- Startup failures, sleep/wake behavior, ephemeral storage, and free database limitations.
- Differences between the deployed Git commit and the current local code, where verifiable.
- Whether production smoke tests have actually been performed.

Do not claim to have inspected live Render settings, production database records, logs, or service health unless you actually have access to that evidence.

Never reveal secret values. Report missing settings by variable name only.

## 9. Audit Git and project hygiene

Check:

- Current branch, latest commit, working-tree status, and uncommitted changes.
- Tracked and untracked files that should or should not be committed.
- `.gitignore` coverage for secrets, databases, uploads, build outputs, and local artifacts.
- Accidentally tracked private media or credentials.
- Dependency files and reproducible installation.
- Dead code, obsolete files, inconsistent naming, and outdated documentation.
- Whether the documented project structure and commands match the actual repository.
- Whether the intended deployment commit is actually pushed.

Inspect relevant Git history when needed to understand current behavior, but focus on auditing the current implementation. Do not make assumptions based only on commit messages.

## 10. Run comprehensive tests

Run the tests and checks that are safe and feasible in the current environment.

At minimum, consider:

- Backend automated tests.
- Frontend production build and available frontend tests.
- Static analysis and linting where configured.
- Django system checks.
- Migration consistency checks.
- API and authentication tests.
- Database-related tests.
- Docker image build.
- Configuration and dependency checks.

Do not run destructive tests against the live production database or modify production user accounts.

Clearly report every command executed and whether it passed, failed, or could not be run. Separate actual results from proposed tests. Do not hide failures or claim unexecuted tests passed.

## 11. Classify every finding

For each issue, provide:

- ID.
- Subsystem.
- Severity: Critical, High, Medium, or Low.
- Exact file, class, function, endpoint, or configuration involved.
- Reproducible symptom or evidence.
- Root cause, if confirmed.
- Impact on users or system behavior.
- Recommended fix.
- Test needed to verify the fix.
- Whether it affects local development, production, or both.
- Whether the finding is confirmed or still requires investigation.

Prioritize real correctness, security, data-integrity, and deployment problems over cosmetic refactoring.

Do not invent issues to make the audit look thorough. If an area passes the available checks, report the evidence and the limits of that verification.

## 12. Required final deliverables

Create a comprehensive audit report at:

`docs/CarSV_Full_Project_Audit.md`

Organize it clearly:

1. Executive Summary
2. Scope and Audit Method
3. Repository Structure
4. Architecture Overview
5. Frontend Audit
6. Backend and API Audit
7. Database and Data Integrity Audit
8. Authentication and Security Audit
9. Business Workflow Audit
10. External Integrations Audit
11. Docker and Local Development Audit
12. Render Production Audit
13. Git and Dependency Hygiene
14. Testing Results
15. Findings by Severity
16. Requirements and Feature Coverage
17. Known Limitations and Unverified Areas
18. Prioritized Remediation Plan
19. Final Readiness Assessment

Include a feature coverage matrix and an end-to-end integration matrix. Include Mermaid diagrams only when they accurately reflect the actual code.

The report must distinguish:
- Verified working.
- Implemented but not fully tested.
- Partially implemented.
- Broken.
- Missing.
- Unable to verify.

Do not label the project fully complete merely because the UI looks finished or the build succeeds.

## 13. Constraints

- Audit the current project thoroughly before making conclusions.
- Do not modify application code during the initial audit.
- Do not deploy, commit, push, change production environment variables, or alter Git history.
- Do not delete files, reset databases, remove Docker volumes, or modify production records.
- Do not expose credentials, private data, or secret values.
- Do not make unrelated refactoring changes.
- If a test requires unavailable credentials, external services, or production access, document that limitation rather than fabricating a result.

Finish by presenting a concise summary of the most important findings, the report path, the tests actually executed, and whether the project is ready for submission based on the available evidence.

The goal is a genuine full-project audit—not a superficial checklist or a report that simply says everything is working.