---
description: Backend-only file proxy routes (/f/raw, /f/image, /f/audio, /f/video)
---

# PRD: Backend-only `/f/*` proxy routes

## Summary

Replace the current `/f/:projectSlug/...` delivery route with explicit proxy routes that keep **only the Contento backend public**.

New routes:

- `/f/raw/:projectSlug/...`
- `/f/image/:projectSlug/...`
- `/f/audio/:projectSlug/...`
- `/f/video/:projectSlug/...`

These routes:

- Fetch objects from MinIO via the backend (MinIO stays internal-only)
- Perform transformations server-side (imgproxy/FFmpeg stay internal-only)
- Stream results to callers (no redirects to MinIO or imgproxy)

No backwards compatibility is required.

This PRD follows the “S3 way” of doing things:

- Clients never sign URLs.
- Clients never hold long-lived credentials or API keys.
- A trusted backend endpoint mints a time-limited, capability-limited **signed URL**.
- The signed URL still points to **Contento’s backend**, which proxies to internal services.

## Goals

- Single public surface: **Next.js backend only**
- No client-visible MinIO or imgproxy URLs
- Unified URL shape for raw delivery and transformations
- Preserve existing auth semantics:
  - Public projects: anonymous reads allowed
  - Private projects: reads require API key or signed token

## Non-goals

- CDN optimization
- Multi-region PoPs
- Full multipart/chunked upload protocol (can be added later)

## External API / URL scheme

### Raw file

`GET /f/raw/:projectSlug/<path>`

- Streams object bytes from MinIO
- Access control:
  - public project: no auth required
  - private project: requires a signed URL token (`?token=...`) minted by the backend

### Image

`GET /f/image/:projectSlug/<path>?format=webp&w=...&h=...&q=...&blur=...&fit=...`

- If no transform params, behaves like raw download
- If transform params exist:
  - backend calls imgproxy internally
  - backend streams imgproxy response to client

### Audio / Video

`GET /f/audio/:projectSlug/<path>?format=mp3`

`GET /f/video/:projectSlug/<path>?format=webm`

- If no `format` provided, behaves like raw download
- If `format` provided and differs from source:
  - backend runs FFmpeg transform
  - backend streams output
  - optional: cache to MinIO (same behavior as today)

## Auth model

- Resolve project by `projectSlug`
- If `project.visibility === "private"`:
  - accept `Authorization: Bearer <apiKey>` with scope `read` and matching `projectId`, OR
  - accept a signed URL token via `?token=...` (format TBD; see "Signed tokens")

## Range requests (required)

To support large files and media seeking, `/f/*` routes should support:

- `Range` request header
- return `206 Partial Content` when a range is requested
- passthrough/emit:
  - `Accept-Ranges: bytes`
  - `Content-Range`
  - `Content-Length`

Implementation uses S3 `GetObjectCommand` with `Range` parameter.

## Signed tokens

Signed token behavior should follow S3-style presign semantics, but for backend URLs.

- Token is opaque to clients
- Token is time-limited
- Token is capability-limited (method + route + object path + optional transform params)

### Token binding

The token must bind at least:

- HTTP method (e.g. `GET`, `PUT`)
- Route kind (`raw|image|audio|video`)
- `projectSlug`
- object `path`
- `exp` (unix seconds)

And when transforms exist, also bind the relevant query params (e.g. `format`, `w`, `h`, `q`, etc.).

### Signing authority

The backend mints signed URLs via:

- `POST /api/v1/projects/:id/sign/read`
- `POST /api/v1/projects/:id/sign/upload`

These endpoints authenticate the caller using:

- `Authorization: Bearer <apiKey>` (recommended; never exposed to frontend)
- or an admin session for server-side/admin UI use

The response contains a URL that points to Contento, for example:

- `GET https://your-domain.com/f/raw/:projectSlug/<path>?token=...`
- `PUT https://your-domain.com/api/v1/projects/:id/upload?path=...&token=...`

No MinIO/imgproxy URLs are returned to clients.

## Operational / deployment notes

- MinIO and imgproxy must be internal-only (no public ports)
- Backend must have network access to MinIO and imgproxy
- If a reverse proxy exists (nginx/Caddy), it only forwards to the backend

## Rollout plan

1. Implement new `/f/{raw,image,audio,video}` routes.
2. Update `sign/read` to return URLs under the new scheme.
3. Update docs and admin UI to use the new URLs.
4. Remove old `/f/:projectSlug/...` route.

## Testing plan

- Public project:
  - raw download works
  - image transform works
- Private project:
  - 401 without auth
  - works with API key
  - works with signed token
- Range:
  - `Range: bytes=0-1023` returns `206`
- imgproxy:
  - request returns bytes and content-type expected
- FFmpeg:
  - transform stream starts quickly
  - caching path is written
