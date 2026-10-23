# Public catalog media (baked into the Docker image)

These folders are **public** catalog assets served under `/media/` without a signature:

- `services/`
- `parts/`
- `blog/`
- `products/`

They are copied into `MEDIA_ROOT` at image build time (`Dockerfile`).  
Do **not** put customer uploads, payment proofs, vehicle photos, inspections, or staff/user portraits here.

Local private media continues to live in gitignored `api-backend/media/` and is never deleted by deploy prep.
