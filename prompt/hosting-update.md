# Task: Dockerize Existing React + Django Project and Prepare for Live Hosting

My existing project currently runs locally on Fedora Linux.

- **Frontend:** React
- **Backend:** Django
- **Database:** SQLite
- **Current development environment:** Fedora Linux
- **Other developers:** May use Windows or Linux
- **Future goal:** Live hosting with PostgreSQL, Docker, a domain, and HTTPS

Docker Engine, Docker Compose, and PostgreSQL 17 are already installed on my Fedora machine. A standalone PostgreSQL test container named `postgres-db` is currently running.

## 1. Inspect the Existing Project

Before making changes, inspect the actual project structure, dependencies, frontend/backend communication, Django settings, models, migrations, authentication, environment variables, API endpoints, static files, media uploads, and current development workflow.

Understand how the application works before changing its configuration. Do not assume file paths, project structure, or implementation details.

## 2. Preserve SQLite and Existing Data

This is very important.

- Keep the original SQLite database file unchanged as a backup.
- Do not delete, overwrite, rename, or modify the original SQLite database.
- Make a separate backup before performing any database migration.
- Configure PostgreSQL as the primary database for Docker-based development and production.
- Preserve existing users, records, relationships, and other data when migrating to PostgreSQL.
- Provide safe, project-specific SQLite-to-PostgreSQL migration instructions.
- Keep SQLite available for the existing local workflow if practical, using separate development and production configuration where appropriate.
- Never perform destructive database operations without my permission.

Do not remove existing Django models, migrations, or database-related functionality unnecessarily.

## 3. Configure Docker and PostgreSQL

Configure Docker Compose to run the existing application with:

- React frontend
- Django backend
- PostgreSQL database
- Nginx reverse proxy if appropriate

Create or update the necessary Dockerfiles, `docker-compose.yml`, `.env.example`, `.gitignore`, and related configuration files.

Requirements:

- Configure Django to connect to PostgreSQL using environment variables and the correct Docker service hostname.
- Use persistent Docker volumes for PostgreSQL data.
- Persist user-uploaded media files when the application requires them.
- Configure Django migrations and static files correctly.
- Use health checks and service dependencies where appropriate.
- Do not expose PostgreSQL publicly.
- Avoid unnecessary dependencies, services, and configuration files.

The existing `postgres-db` container is only a test container. Check for port and container-name conflicts before starting the project's PostgreSQL service. Do not delete existing containers or database volumes without permission.

## 4. Support Other Developers on Windows and Linux

I develop the project on Fedora Linux, but other developers must be able to clone the same Git repository and run the application on Windows or Linux.

- Use Docker Compose to provide a consistent application environment across supported operating systems.
- Minimize OS-specific setup and avoid requiring developers to install PostgreSQL separately.
- Avoid hardcoded operating-system-specific paths.
- Provide clear setup instructions for Windows with Docker Desktop and Fedora/Linux with Docker Engine.
- Ensure environment files, file permissions, volume mounts, and startup commands are appropriate for each platform.
- Keep the existing Fedora development workflow functional where practical.
- Do not assume I need to run the application on Windows and Fedora simultaneously.

The goal is for another developer to clone the repository, configure the required environment variables, and start the application using documented commands.

## 5. Preserve All Existing Functionality

Do not rebuild the application from scratch, redesign the UI, remove features, replace real functionality with mock data, or modify unrelated code.

Preserve all existing:

- Django models and database relationships
- API endpoints and business logic
- Registration and login flows
- Email/password authentication
- Google authentication
- Telegram authentication
- Authorization and permissions
- Frontend pages and API integrations
- File uploads and other existing features

Change only what is necessary for database migration, Docker, environment configuration, cross-platform compatibility, and deployment.

Update Google or Telegram provider settings, callback URLs, redirect URLs, or registered domains only where necessary for the new environment. Do not assume these changes can be made entirely in code; identify any required external provider configuration.

## 6. Prepare for Production Hosting

Prepare the project for deployment to a real hosting server.

- Use a production-ready Django application server, not Django's development server.
- Build and serve React appropriately for production.
- Configure Nginx as a reverse proxy if appropriate.
- Separate development and production settings where necessary.
- Configure API base URLs, Django `ALLOWED_HOSTS`, CORS, CSRF trusted origins, cookies, and HTTPS correctly.
- Configure Django static files and uploaded media.
- Use environment variables or a suitable secrets mechanism for credentials.
- Never commit real secrets, production `.env` files, or database credentials to Git.
- Provide an `.env.example` with placeholder values only.
- Configure PostgreSQL persistence and a database backup strategy.
- Prepare for a domain name, DNS records, and a valid SSL/TLS certificate.
- Ensure the frontend and backend do not depend on localhost after deployment.

Do not purchase hosting, register a domain, change DNS records, or modify external provider settings without my authorization.

## 7. Test the Changes

Build and test the configuration as far as the local environment permits.

Verify:

- Docker images build successfully.
- All required containers start correctly.
- Django connects to PostgreSQL.
- Database migrations execute successfully.
- Existing data can be migrated safely.
- React can communicate with Django.
- Authentication and major existing application flows remain functional.
- Static and media files work correctly.
- PostgreSQL data persists after container restarts.
- The application can be started using the documented workflow.

Fix verified errors. Clearly report anything that requires manual configuration or cannot be tested locally. Do not claim that live hosting, DNS, HTTPS, or external authentication works unless it has actually been verified.

## 8. Provide a Concise Deployment Guide

After implementing the changes, provide instructions specific to the actual project covering:

1. Running and stopping the application on Fedora and Windows.
2. Required environment variables and initial setup.
3. Migrating existing SQLite data to PostgreSQL safely.
4. Deploying the application to a hosting server.
5. Installing and configuring Docker on the server.
6. Connecting the domain through DNS.
7. Enabling HTTPS.
8. Updating the application after Git changes.
9. Backing up and restoring PostgreSQL.
10. Troubleshooting common errors.

Use actual project paths, service names, and commands. Clearly distinguish commands executed on the development computer from those executed on the hosting server.

## Working Rules

Inspect first, then implement the necessary changes directly in the existing project.

Keep the changes focused. Avoid unnecessary explanations, files, dependencies, UI changes, and architectural rewrites. Do not guess missing project details, delete existing data, or claim unverified success.

If an essential decision depends on missing information, identify it clearly and continue with the safe work that can already be completed.

**Final goal:** Preserve my existing React + Django application and its functionality, retain SQLite safely as a backup and optional local-development database, use PostgreSQL through Docker Compose, allow other developers to run the project on Windows or Linux from the same Git repository, and prepare the application for reliable live hosting through a domain with HTTPS.