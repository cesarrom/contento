# Contento — Architecture & Implementation Plan

## What Is Contento?

Contento is a self-hosted, API-first file management platform inspired by Bytescale.
It orchestrates proven open-source services and exposes them through a single unified entrypoint: a Next.js application that acts as the control plane, API gateway, and admin UI.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Project** | An isolated namespace (maps to a MinIO bucket + DB record). Has its own visibility, API keys, and settings. |
| **API Key** | Scoped to a project. Used to authenticate all API calls (upload, download, transform, sign). |
| **Object** | A file stored in MinIO under a project's bucket. |
| **Transformation** | On-the-fly media processing: images via imgproxy, video/audio via a sidecar FFmpeg worker. |
| **Signed URL** | Time-limited URL for upload or download, optionally embedding transformation params. |

---

## Deployment Context

- **Dokploy** is the deployment platform. **authentik** and **PostgreSQL** are already running there as shared services — we connect to them, we do NOT manage them.
- Package manager: **pnpm** everywhere (app + worker).
- ORM: **Drizzle ORM**. After schema changes always run `pnpm db:generate`. Use `pnpm db:migrate` (not `db:push`) to apply migrations.
- **Next.js app lives at the repo root** (not in `./app`). Worker lives in `./worker`.

## Services Stack (Docker Compose)

### Our Services (what we deploy)

| Service | Role | Image |
|---|---|---|
| **MinIO** | S3-compatible object storage. One bucket per project. | `minio/minio` |
| **imgproxy** | On-the-fly image transformation (resize, format convert, crop, watermark). Signed URL support built-in. | `ghcr.io/imgproxy/imgproxy` |
| **Redis** | Session store + BullMQ job queue for async transforms. | `redis:7` |
| **contento-app** | Next.js control plane: admin UI + public API gateway. | Built from `.` (repo root) |
| **contento-worker** | Node.js sidecar for FFmpeg jobs (video/audio conversion). Consumes Redis queue. | Built from `./worker` |

### External Shared Services (already in Dokploy)

| Service | Role |
|---|---|
| **PostgreSQL** | Metadata DB — we get a connection string from Dokploy |
| **authentik** | SSO / OIDC — we get issuer URL + client credentials from Dokploy |

### Why This Stack?

- **MinIO**: Zero-friction S3 compatibility. Presigned upload/download URLs are native. Multi-bucket isolation per project. Admin UI included.
- **imgproxy**: Purpose-built for this exact use case. HMAC-signed URLs, format conversion (WebP, AVIF, JPEG, PNG), resize, crop — all via URL params. Reads directly from MinIO via S3 source.
- **authentik**: Best-in-class self-hosted IdP. OIDC means Next.js (NextAuth) integration is trivial. Already running — zero ops overhead.
- **PostgreSQL**: Already running in Dokploy — we just point our `DATABASE_URL` at it.
- **Redis**: Needed for BullMQ queue (FFmpeg jobs) and NextAuth session backing.
- **FFmpeg worker**: imgproxy handles images only. For video/audio conversions we add a simple worker that reads from MinIO, converts via FFmpeg, writes result back to MinIO, and serves the output via a signed download URL. We keep it as a separate service to avoid contaminating imgproxy.

---

## Architecture Diagram

```
Browser / API Client
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │          contento-app  (Next.js)            │
  │                                             │
  │  /admin/*        — Admin UI (SSO via OIDC) │
  │  /api/v1/*       — Public REST API          │
  │    projects, apikeys, files, sign, upload   │
  │  /f/{project}/{path}  — File Delivery       │
  │    → images: proxy to imgproxy (signed)     │
  │    → video/audio: enqueue FFmpeg job        │
  │    → raw: redirect to MinIO presigned URL   │
  └──────┬────────────────┬────────────────────┘
         │                │
         ▼                ▼
     MinIO            imgproxy
  (S3 storage)   (image transforms)
         │                │
         └────────────────┘
              reads from
              MinIO S3 source

  authentik ← OIDC → contento-app (admin login)
  PostgreSQL ← used by contento-app + authentik
  Redis      ← used by contento-app worker queue + authentik
  contento-worker ← consumes Redis queue → FFmpeg → MinIO
```

---

## Feature → Implementation Mapping

### S3 Compatible
- MinIO provides S3 API at `:9000`
- contento-app exposes `/api/v1/projects/:id/upload` which returns a MinIO presigned PUT URL
- Advanced users can also use MinIO directly with project-scoped credentials (we create MinIO service accounts per project)

### SSO via authentik
- authentik runs as IdP
- contento-app uses NextAuth with OIDC provider pointing at authentik
- Only the `/admin/*` routes require SSO
- The public `/api/v1/*` routes use API key auth (Bearer token in header)

### Projects
- Each project stored in PostgreSQL (`projects` table)
- Project creation → automatically creates MinIO bucket + MinIO service account (scoped to bucket)
- Project has: name, slug, visibility (public/private), created_at

### API Keys
- Table `api_keys`: id, project_id, name, key_hash, scopes (read/write/admin), expires_at
- Key is shown once on creation (we store bcrypt hash)
- All `/api/v1/*` endpoints validate Bearer token against `api_keys` table

### Bucket/File Visibility
- `projects.visibility`: `public` | `private`
- Public: `/f/{project}/{path}` serves file without auth (MinIO bucket policy = public-read)
- Private: `/f/{project}/{path}` requires valid signed URL or valid API key header

### Transformation on Demand
**Images** (via imgproxy):
- URL pattern: `/f/{project}/{path}?format=webp&w=800&h=600`
- contento-app generates imgproxy-signed URL and 302 redirects to it
- imgproxy reads from MinIO S3 source

**Video/Audio** (via contento-worker + FFmpeg):
- URL pattern: `/f/{project}/{path}?format=mp4` (or mp3, wav, etc.)
- contento-app enqueues a job in Redis (BullMQ)
- If job result exists in MinIO cache bucket → redirect immediately
- Otherwise → 202 + polling URL, worker converts and writes to cache, client polls

### Signed URLs
**Signed Upload URL**:
```
POST /api/v1/projects/:id/sign/upload
Body: { path, contentType, expiresIn }
Returns: { url, method: "PUT", expiresAt }
```
→ Generates MinIO presigned PUT URL

**Signed Read URL**:
```
POST /api/v1/projects/:id/sign/read
Body: { path, expiresIn, transform?: { format, w, h, ... } }
Returns: { url, expiresAt }
```
→ For images: generates imgproxy-signed URL (HMAC) with transform params embedded
→ For others: generates MinIO presigned GET URL

---

## Database Schema (PostgreSQL)

```sql
-- Projects
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'private', -- 'public' | 'private'
  bucket_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- API Keys
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL,
  key_prefix  TEXT NOT NULL, -- first 8 chars for display
  scopes      TEXT[] DEFAULT '{"read"}',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Transform Jobs (cache tracking)
CREATE TABLE transform_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id),
  source_path  TEXT NOT NULL,
  params       JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  output_path  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## API Surface (v1)

```
# Projects
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
DELETE /api/v1/projects/:id

# API Keys
GET    /api/v1/projects/:id/keys
POST   /api/v1/projects/:id/keys
DELETE /api/v1/projects/:id/keys/:keyId

# Files
GET    /api/v1/projects/:id/files           list files (MinIO list objects)
DELETE /api/v1/projects/:id/files/*path     delete object

# Upload
POST   /api/v1/projects/:id/sign/upload     get presigned PUT URL
POST   /api/v1/projects/:id/sign/read       get presigned GET / transformed URL

# File Delivery (public entrypoint)
GET    /f/:projectSlug/*path                serve / redirect / transform
```

---

## Admin UI Pages

| Route | Description |
|---|---|
| `/admin` | Dashboard: project list |
| `/admin/projects/new` | Create project |
| `/admin/projects/[id]` | Project detail: settings, visibility |
| `/admin/projects/[id]/keys` | API key management |
| `/admin/projects/[id]/files` | File browser |

UI stack: Next.js 14 App Router, TailwindCSS, shadcn/ui, Lucide icons.

---

## Implementation Order

1. `PLAN.md` (this file) ✅
2. `docker-compose.yml` + `.env.example`
3. `app/` — Next.js init + dependencies
4. DB schema migration (via `drizzle-orm`)
5. Core API routes: projects CRUD, API key management
6. MinIO integration: bucket provisioning, presigned URLs
7. File delivery route `/f/` with imgproxy redirect
8. Signed URL endpoints
9. FFmpeg worker service
10. Admin UI
11. README

---

## File Structure

```
contento/
├── PLAN.md
├── docker-compose.yml
├── .env.example
├── app/                    ← Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/      ← Admin UI (protected by SSO)
│   │   │   ├── api/v1/     ← Public REST API
│   │   │   └── f/          ← File delivery route
│   │   ├── lib/
│   │   │   ├── db/         ← Drizzle ORM schema + client
│   │   │   ├── minio.ts    ← MinIO client wrapper
│   │   │   ├── imgproxy.ts ← imgproxy URL signer
│   │   │   ├── auth.ts     ← NextAuth config
│   │   │   └── apikey.ts   ← API key validation middleware
│   │   └── components/     ← shadcn/ui components
│   ├── package.json
│   ├── Dockerfile
│   └── drizzle.config.ts
└── worker/                 ← FFmpeg conversion worker
    ├── src/
    │   └── index.ts
    ├── package.json
    └── Dockerfile
```
