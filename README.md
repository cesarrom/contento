# Contento

Self-hosted, API-first file management platform. Inspired by Bytescale, built on open-source services.

## Stack

| Service | Role |
|---|---|
| **Next.js** (root) | Admin UI + public API gateway |
| **MinIO** | S3-compatible object storage |
| **imgproxy** | On-the-fly image transformation |
| **Redis** | BullMQ job queue |
| **contento-worker** | FFmpeg video/audio conversion |
| **PostgreSQL** | Metadata DB (external, provided by Dokploy) |
| **authentik** | SSO/OIDC (external, provided by Dokploy) |

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, AUTHENTIK_*, IMGPROXY_KEY/SALT
```

Generate imgproxy key/salt:
```bash
xxd -g 2 -l 64 -p /dev/urandom | tr -d '\n'
```

### 2. Run migrations

```bash
pnpm db:migrate
```

### 3. Dev

```bash
pnpm dev
```

### 4. Docker (production)

```bash
docker compose up -d
```

## Database Workflow

```bash
# After editing src/lib/db/schema.ts:
pnpm db:generate   # generates SQL migration files in drizzle/
pnpm db:migrate    # applies migrations (never use db:push)
```

## API Reference

All API routes are under `/api/v1`. Authenticate with `Authorization: Bearer <api-key>`.

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/projects` | List all projects |
| `POST` | `/api/v1/projects` | Create project |
| `GET` | `/api/v1/projects/:id` | Get project |
| `PATCH` | `/api/v1/projects/:id` | Update name/visibility |
| `DELETE` | `/api/v1/projects/:id` | Delete project |

### API Keys

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/projects/:id/keys` | List API keys |
| `POST` | `/api/v1/projects/:id/keys` | Create API key (key shown once) |
| `DELETE` | `/api/v1/projects/:id/keys/:keyId` | Delete API key |

### Files

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/projects/:id/files` | List objects |
| `DELETE` | `/api/v1/projects/:id/files` | Delete object (`body: { key }`) |

### Signed URLs

```http
POST /api/v1/projects/:id/sign/upload
{ "path": "/images/photo.jpg", "contentType": "image/jpeg", "expiresIn": 3600 }
→ { "url": "...", "method": "PUT", "expiresAt": "..." }

POST /api/v1/projects/:id/sign/read
{ "path": "/images/photo.jpg", "expiresIn": 3600, "transform": { "format": "webp", "width": 800 } }
→ { "url": "...", "expiresAt": "..." }
```

### File Delivery

```
GET /f/:projectSlug/:path
GET /f/:projectSlug/:path?format=webp&w=800&h=600   # image transform
GET /f/:projectSlug/:path?format=mp4                 # video convert (async)
```

## Features

- **Projects** — isolated namespaces, each maps to a MinIO bucket
- **API keys** — scoped (read / write / admin), optional expiry
- **Visibility** — public (no auth) or private (API key / signed URL)
- **Image transformation** — via imgproxy: resize, crop, format (webp/avif/jpg/png), quality, blur
- **Video/Audio conversion** — via FFmpeg worker: async, results cached in MinIO
- **Signed upload URLs** — presigned MinIO PUT URLs
- **Signed read URLs** — imgproxy-signed (images) or MinIO presigned GET (others)
- **SSO** — admin UI protected via authentik OIDC
