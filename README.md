# Contento

Self-hosted, API-first file management platform. Inspired by Bytescale, built on open-source services.

## What is this?

Contento is a self-hosted file platform you can run as:

- A private internal utility (upload/serve/transforms)
- An on-prem product
- The backend of a SaaS (with your own auth + billing layer)

It provides:

- A REST API (`/api/v1`) for projects, API keys, files, and signed URLs
- A delivery endpoint (`/f/...`) that serves raw files and performs transformations
- A public landing (`/`) and documentation (`/docs`)
- An admin UI (`/admin`) protected by SSO (Authentik) or a local dev-auth fallback

## Stack

| Service | Role |
|---|---|
| **Next.js** (root) | Admin UI + public API gateway |
| **MinIO** | S3-compatible object storage |
| **imgproxy** | On-the-fly image transformation |
| **FFmpeg** | Video/audio conversion (runs inline in the Next.js backend) |
| **PostgreSQL** | Metadata DB (external, provided by Dokploy) |
| **authentik** | SSO/OIDC (external, provided by Dokploy) |

## Docs

- **Public landing**: `/`
- **Documentation**: `/docs`
- **Admin UI**: `/admin`

## PRDs

This repo keeps lightweight Product Requirement Documents (PRDs) in `./prds/` to document
user-facing changes.

- Design system PRD: `prds/2026-03-02T1425-design-system.prd.md`

## Quick Start

## Prerequisites

Contento can be run on macOS, Windows, and Linux.

- **Docker run (recommended)**:
  - macOS / Windows: Docker Desktop
  - Linux: Docker Engine + Docker Compose plugin

- **Run from source**:
  - Node.js 20+
  - pnpm

If you're on Windows, running via Docker Desktop is recommended.


### Windows notes

`./start.sh` is a Bash script.

- If you have **Git Bash** installed, you can run it from Git Bash.
- If you use **WSL2**, you can run it inside your WSL distro.
- If you prefer not to run scripts on Windows, use the manual commands below.

### 1. Environment

```bash
cp .env.example .env
# For a first run, you can leave AUTHENTIK_* unset and use the dev-auth fallback.
# For production, fill in DATABASE_URL, NEXTAUTH_SECRET, AUTHENTIK_*, IMGPROXY_KEY/SALT.
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
./start.sh
```

`./start.sh` will create the `shared_db_net` Docker network if it doesn't exist and will start a local
Postgres container when `DATABASE_URL` is not set.

If Authentik is not configured (`AUTHENTIK_*` missing), `./start.sh` enables a local **dev-auth** mode
and prints default credentials to the console.

### Manual startup (no scripts)

External Postgres (set `DATABASE_URL` first):

```bash
docker network create shared_db_net || true
docker compose up -d
```

Isolated local Postgres:

```bash
docker network create shared_db_net || true
docker compose --profile local up -d
```

After the stack starts:

- Landing: `http://localhost:3000/`
- Docs: `http://localhost:3000/docs`
- Admin: `http://localhost:3000/admin`

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
GET /f/:projectSlug/:path?format=mp3                 # audio/video convert (sync, cached)
```

## Features

- **Projects** — isolated namespaces, each maps to a MinIO bucket
- **API keys** — scoped (read / write / admin), optional expiry
- **Visibility** — public (no auth) or private (API key / signed URL)
- **Image transformation** — via imgproxy: resize, crop, format (webp/avif/jpg/png), quality, blur
- **Video/Audio conversion** — via FFmpeg (inline): on-demand, streamed to the client, cached in MinIO
- **Signed upload URLs** — presigned MinIO PUT URLs
- **Signed read URLs** — imgproxy-signed (images) or MinIO presigned GET (others)
- **SSO** — admin UI protected via authentik OIDC

## Disclaimer

This project is provided **as-is**, without warranty of any kind. See [LICENSE.md](./LICENSE.md) for the
full warranty and liability disclaimer.
