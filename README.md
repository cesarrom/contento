# Contento

Self-hosted, API-first file management platform. Inspired by Bytescale, built on open-source services.

## What is this?

Contento is a self-hosted file platform you can run as:

- A private internal utility (upload/serve/transforms)
- An on-prem product
- The backend of a SaaS (with your own auth + billing layer)

It provides:

- A REST API (`/api/v1`) for projects, API keys, files, and signed URLs
- Delivery endpoints (`/f/raw|image|audio|video/...`) that serve raw files and perform transformations through the backend
- A public landing (`/`) and documentation (`/docs`)
- An admin UI (`/admin`) protected by SSO (any OIDC provider) or a local dev-auth fallback

## Stack

| Service | Role |
|---|---|
| **Next.js** (root) | Admin UI + public API gateway |
| **MinIO** | S3-compatible object storage (or any S3-compatible) |
| **imgproxy** | On-the-fly image transformation |
| **FFmpeg** | Video/audio conversion (runs inline in the Next.js backend) |
| **PostgreSQL** | Metadata DB |
| **Any OIDC** | SSO via Authentik, Keycloak, Auth0, Okta, etc. |

## Quick Start

### Option 1: Single Container (Recommended)

The easiest way to get started - everything runs in one container:

```bash
# Run with defaults (embedded MinIO, PostgreSQL, dev auth)
docker run -d -p 3000:3000 contentocms/contento:latest
```

That's it! Access at http://localhost:3000

- Default admin: `admin` / `admin`
- MinIO console: http://localhost:9001

For production, see the [Standalone Docker](/docs/self-hosting/standalone-docker) documentation.

### Option 2: Docker Compose

For more control with separate containers:

```bash
# Clone and run
git clone https://github.com/contentocms/contento.git
cd content
cp .env.example .env
./start.sh
```

This starts PostgreSQL, MinIO, imgproxy, and the Contento app.

See [Docker Compose](/docs/self-hosting/docker-compose) for more options.

## Documentation

- **Quick Start**: [Standalone Docker](/docs/self-hosting/standalone-docker)
- **Docker Compose**: [docker-compose](/docs/self-hosting/docker-compose)
- **Environment Variables**: [Environment](/docs/self-hosting/environment)
- **API Reference**: [API](/docs/api)

## Features

- **Projects** — isolated namespaces, each maps to a storage bucket
- **API keys** — scoped (read / write / admin), optional expiry
- **Visibility** — public (no auth) or private (API key / signed URL)
- **Image transformation** — resize, crop, format (webp/avif/jpg/png), quality, blur
- **Video/Audio conversion** — via FFmpeg: on-demand, streamed to the client
- **Signed upload URLs** — presigned PUT URLs
- **Signed read URLs** — signed URLs with optional transformations
- **SSO** — admin UI protected via any OIDC provider (Authentik, Keycloak, Auth0, Okta, Google)

## Storage Options

Contento supports any S3-compatible storage:

| Provider | Example Endpoint |
|---|---|
| AWS S3 | `https://s3.amazonaws.com` |
| DigitalOcean Spaces | `https://nyc3.digitaloceanspaces.com` |
| Backblaze B2 | `https://s3.us-west-000.backblazeb2.com` |
| Cloudflare R2 | `https://your-account.r2.cloudflarestorage.com` |
| MinIO | `https://minio.example.com` |

## Authentication Options

Contento supports any OIDC provider:

| Provider | Example Issuer |
|---|---|
| Authentik | `https://authentik.example.com/application/o/contento/` |
| Keycloak | `https://keycloak.example.com/realms/master` |
| Auth0 | `https://your-tenant.auth0.com/` |
| Okta | `https://your-domain.okta.com/oauth2/default` |
| Google | `https://accounts.google.com` |

Or use built-in dev auth for development.

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

## Development

```bash
# Install dependencies
pnpm install

# Generate migrations (after schema changes)
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start dev server
pnpm dev
```

## Disclaimer

This project is provided **as-is**, without warranty of any kind. See [LICENSE.md](./LICENSE.md) for the
full warranty and liability disclaimer.
