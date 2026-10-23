Implement the approved Render deployment preparation based on the updated plan.

- Fix Gunicorn to use Render's `PORT`, keeping local Docker Compose working on port 8000.
- Fix production media serving without deleting or overwriting existing images or exposing private customer uploads publicly.
- Configure refresh-cookie settings for production while preserving local authentication.
- Support Render PostgreSQL configuration without changing the local database setup.
- Implement Resend HTTPS email delivery for production and preserve console email locally.
- Add secure, idempotent Django superuser bootstrap without overwriting existing users or logging credentials.
- Update deployment documentation and environment-variable examples.
- Add or update tests and run the relevant test suites.

Inspect the actual code before editing. Preserve existing features, UI, API behavior, local database, Docker volumes, media, and uploads. Do not replace real functionality with mock data.

**Strict limits:** Do not create Render resources, deploy, commit, push, run destructive commands, or expose secrets. Do not run migrations against the local database. Make only the changes needed for deployment readiness.

When finished, report changed files, test results, required Render environment variables, and remaining manual steps. Stop and wait for my approval before deployment.