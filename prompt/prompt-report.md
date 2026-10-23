# CarSV — Complete Project Audit and Technical Report

Act as a senior software engineer, system analyst, and technical report writer. I need a complete academic report documenting my CarSV (Car Garage Management System) project, from its original development to its current hosted state.

You have access to the project repository. Investigate the actual implementation, configuration, documentation, and Git history. Do not rely only on the README, recent commits, or my description.

I will also provide the official project requirements or assignment document. Read that document carefully and use it as a primary reference for the required features, scope, terminology, and report expectations.

## 1. Objectives

Produce one comprehensive, well-organized technical report that explains:

- The original project purpose, objectives, and requirements.
- The system architecture and how the components work together.
- The frontend, backend, database, authentication, and integrations.
- The development process and local environment.
- The main implementation decisions and how features work.
- The problems encountered during development, their root causes, and solutions.
- Git history and significant changes throughout the project.
- Docker-based local deployment and the transition to Render hosting.
- The current production configuration, testing, limitations, and remaining risks.
- How the final implementation meets, partially meets, or does not yet meet the official requirements.

The report must explain the project as a complete system, not just describe individual source files.

## 2. Investigate the whole repository

Start by identifying the repository structure, current branch, Git status, latest commit, remotes, and important historical commits.

Inspect the relevant source files across the entire project, including:

- React frontend pages, components, routing, state management, API clients, authentication flows, and styling.
- Django backend applications, models, serializers, views, APIs, permissions, business logic, and management commands.
- Database models, relationships, migrations, and database configuration.
- Login, registration, email verification, password reset, Google/Auth0, and Telegram authentication.
- Booking, vehicle, service, repair, parts, products, customer, staff, manager, and administrator workflows where implemented.
- File uploads, images, customer documents, payment proofs, and media access controls.
- Dockerfiles, Docker Compose, entrypoint scripts, environment variables, and local development instructions.
- Render deployment configuration and documentation.
- Resend email integration.
- Tests, fixtures, seed commands, and sample data.
- Existing documentation and relevant project configuration files.

Do not claim a feature exists merely because a model, route, button, or placeholder exists. Trace important features through the frontend, API, backend logic, database, and actual configuration where possible.

Do not expose credentials, secret values, private user data, access tokens, or other sensitive information in the report.

## 3. Investigate the project history

Use Git history to reconstruct the development timeline from the earliest available commit to the current state.

- Inspect commit messages, relevant diffs, branches, and file history.
- Identify significant architectural and functional changes.
- Investigate actual historical problems and their fixes where the evidence supports them.
- Explain why changes were made when commit messages, code, documentation, or other evidence establish the reason.
- Distinguish confirmed historical problems from issues discovered during the current audit.
- If the full history is unavailable, explicitly state the limits of the available evidence.

Do not invent dates, motivations, failed attempts, fixes, or conversations that cannot be verified.

## 4. Document the local development environment

Explain the actual local setup and how the system runs during development.

Cover, where applicable:

- Required tools, languages, frameworks, libraries, and versions.
- Frontend and backend directory structures.
- How the React frontend communicates with the Django API.
- Database choices and configuration for local development.
- Environment variables and safe configuration practices.
- Docker Compose services, ports, networking, volumes, and persistence.
- How to build, start, stop, restart, inspect, and test the application locally.
- The difference between running services manually and running them through Docker.
- How uploaded files, catalog images, and database data are stored.

Use commands verified against the actual repository. Do not assume a command, port, service name, or configuration exists without checking.

## 5. Explain the system architecture and feature workflows

Provide a clear architecture overview and explain how data moves through the frontend, backend, and database.

For each major implemented feature, explain:

1. Its purpose.
2. The user or role that uses it.
3. The frontend interaction.
4. The API endpoint or backend processing involved.
5. The relevant database models and relationships.
6. Validation, authentication, and authorization.
7. Its current implementation status and limitations.

Explain important relationships between booking, vehicle, customer, service, repair, staff, technician, parts, and other relevant entities based on the actual schema.

Identify incomplete integrations, duplicated logic, mock data, hardcoded data, and functionality that exists only in the UI.

## 6. Document authentication and security

Explain the actual implementation of:

- Email/password registration and login.
- Email verification and password reset.
- Google authentication through Auth0.
- Telegram authentication and account linking, if implemented.
- Access and refresh tokens, cookies, sessions, and frontend credential handling.
- Email normalization and account uniqueness.
- Role-based permissions.
- Public catalog images versus private uploads.
- CORS, CSRF, production HTTPS, secret management, and API validation.

Document the authentication problems encountered or discovered, including the current issue where Google/Auth0 login works in production but email/password login using the same email is rejected.

Explain verified root causes only when supported by evidence. If the issue is not yet resolved, clearly mark it as unresolved and explain what must be investigated.

Do not claim that account linking, email verification, MFA, or security protections work unless their actual behavior has been verified.

## 7. Explain the database

Document the actual database technology and configuration used locally and in production.

Include:

- Main entities and relationships.
- Important constraints and validation.
- Migrations and schema management.
- Differences between local and hosted databases.
- How initial catalog data is seeded.
- Which data is persistent and which is temporary.
- How data is protected during deployment.

Include an ER diagram if the actual models provide enough evidence to construct one. Make sure the diagram matches the real schema rather than an idealized design.

Never inspect or publish real passwords, secret values, or private customer records.

## 8. Explain deployment from local development to Render

Reconstruct the deployment process using the current configuration and Git history.

Cover:

- Why Docker is used locally.
- How the frontend, backend, and database communicate locally.
- GitHub repository and deployment branch.
- Render PostgreSQL, API Web Service, and frontend Static Site.
- Docker image building and startup.
- Database URL and migrations.
- Static assets, catalog media, private uploads, and media URL handling.
- Production environment variables by purpose, without revealing secret values.
- CORS, CSRF, HTTPS, cookie configuration, and frontend/backend URLs.
- Resend email delivery and domain verification requirements.
- SPA rewrites and client-side routing.
- Initial administrator setup and demo catalog seeding.
- Production smoke tests and deployment verification.

Clearly distinguish configuration that is actually present from settings that are merely documented or proposed.

Document the limitations of free hosting, including service sleep, temporary filesystem storage, database expiry, and email sender restrictions, as verified against the actual hosting plan and configuration.

## 9. Problems, troubleshooting, and solutions

Create a chronological, evidence-based problem log.

For each significant problem, document:

- Problem description.
- Symptoms or error observed.
- Root cause, if verified.
- How it was investigated.
- The solution implemented.
- Files or configuration affected.
- Tests or evidence confirming the fix.
- Whether the issue is resolved, partially resolved, or still open.

Investigate historical Git changes and current source code for real examples. Include relevant problems from local development, database configuration, Docker, frontend/backend integration, authentication, email delivery, media handling, and Render deployment when evidence supports them.

Do not fabricate errors or claim that a fix worked merely because code was changed.

## 10. Testing and quality assessment

Inspect the actual test suite and available test results.

Document:

- Backend automated tests.
- Frontend build and available frontend tests.
- Authentication and authorization tests.
- Database and API behavior tests.
- Production smoke tests, if documented or performed.
- What is covered and what is not covered.
- Known failures, gaps, and risks.

Separate tests that were actually run from tests that are only recommended. Never report a successful test without evidence.

## 11. Requirements compliance matrix

After I provide the official assignment requirements, create a traceability matrix with these columns:

| Requirement | Expected behavior | Actual implementation | Evidence in code/configuration/tests | Status | Remaining work |
|---|---|---|---|---|---|

Use these statuses consistently:

- Implemented and verified.
- Implemented but not fully verified.
- Partially implemented.
- Not implemented.
- Unable to verify.

Do not mark a requirement as complete just because a corresponding screen or database model exists.

If the official requirements conflict with the current implementation, document the discrepancy rather than silently changing the requirement.

## 12. Report structure and writing quality

Produce one complete, professional academic technical report with a clear and consistent hierarchy.

Use this general structure, adapting it to the official assignment requirements:

1. Title Page
2. Executive Summary
3. Introduction
4. Project Background and Objectives
5. Requirements and Scope
6. Technology Stack and Development Environment
7. System Architecture
8. Database Design
9. Frontend Implementation
10. Backend and API Implementation
11. Authentication and Security
12. Core Business Workflows
13. Local Development and Docker
14. Git History and Development Timeline
15. Deployment to Render
16. Problems Encountered and Solutions
17. Testing and Results
18. Requirements Compliance
19. Limitations and Remaining Issues
20. Conclusion and Recommendations
21. References and Appendices, where appropriate

Use straightforward academic English that a teacher can follow without needing to read the source code.

Keep sections focused on their own topics. Avoid repeating the same information across multiple chapters. Use tables for comparisons, numbered steps for procedures, diagrams for architecture and workflows, and code snippets only when they help explain a real implementation.

Explain technical terms when first introduced. Define acronyms. Use actual project names, paths, components, models, endpoints, and environment settings where useful.

Include Mermaid diagrams when supported by the evidence, such as:
- System architecture.
- Authentication flows.
- Booking and repair workflow.
- Local Docker architecture.
- Render production architecture.
- Database ER diagram.

Every diagram must reflect the actual implementation.

## 13. Evidence and accuracy rules

- Use the actual repository as the main technical source.
- Use the official assignment requirements as the authority for expected behavior.
- Use Git history as evidence of development changes.
- Cite source files, relevant functions/classes, API routes, migrations, tests, commits, and configuration sections where possible.
- Clearly distinguish verified facts, documented configuration, reasonable inference, and unresolved questions.
- Never invent features, test results, requirements, sources, deployment steps, or historical events.
- If an important file or history entry cannot be accessed, state that limitation.
- Do not expose sensitive values in examples or appendices.

## 14. Deliverable and working process

First inspect the repository and any assignment documents I provide. If the assignment document has not been provided yet, tell me what file you need and continue only with a preliminary audit if useful.

Then produce the full report as one coherent document, not a collection of disconnected notes.

Save the final report in the repository as `docs/CarSV_Technical_Report.md`, unless the official assignment requires another format. Create the `docs/` directory if necessary.

If the report needs diagrams, include them in the document using Mermaid or another maintainable format supported by the repository.

Do not modify application code, database data, Docker volumes, production services, environment secrets, Git history, or deployment configuration while writing the report.

Do not commit or push the report. Finish by providing:
1. The report file path.
2. A summary of the repository areas inspected.
3. Any limitations in the available evidence.
4. Any questions that require my input.
5. A list of claims that still need verification before I submit the report to my teacher.