---
description: Per-project CORS allowlist using wrapper-based helper
---

# PRD: Project-based CORS wrapper

## Summary

Expose a per-project list of allowed browser origins (`allowedOrigins`) and enforce it centrally via a small wrapper so each API/delivery handler stays clean. Admin UI is same-origin, so it bypasses the allowlist automatically.

## Goals

1. Let admins manage allowed origins per project (array of origins like `https://app.example.com`).
2. Enforce CORS on `/api/v1/projects/*` and `/f/{raw,image,audio,video}` routes using a single helper.
3. Keep each route’s implementation minimal: e.g. `export const GET = withProjectCors("image", handler)`.
4. Document the feature (docs, README, LLM resources) and add UI inputs.

## Non-Goals

- Automatic verification of origin ownership.
- Advanced CORS options beyond allow/deny.
- Changing existing auth/token flows (API keys + signed URLs stay the same).

## Data model

Already done: `projects.allowed_origins TEXT[] DEFAULT '{}' NOT NULL`.

## API surface

- `POST /api/v1/projects` accepts optional `allowedOrigins` array.
- `PATCH /api/v1/projects/:id` accepts `allowedOrigins` array.
- Responses include `allowedOrigins`.
- Validation: each entry must be a full origin (`http(s)://host[:port]`).

## Runtime behavior

Create `withProjectCors(kind, handler)` that:
1. Resolves the project (by slug or id) once the auth/token logic has identified it (helper signature includes `project` argument).
2. Determines request origin: same origin allowed automatically; otherwise must be present in `project.allowedOrigins`.
3. Handles `OPTIONS` preflights automatically (responds `204` with headers).
4. Wraps route responses to inject `Access-Control-Allow-*` headers when allowed.

Usage examples:
- `/f/image/[projectSlug]/...`: `export const GET = withProjectCors("image", handler);`
- `/api/v1/projects/[id]/sign/upload`: `export const POST = withProjectCors("api", handler);`

Implementation details:
- Helper inspects `req.headers.get("origin")`. If missing, treat as server-side => skip CORS.
- Same-origin detection via `req.nextUrl.origin`.
- Allowlist lookup from `project.allowedOrigins` (normalized to lowercase origins).
- If not allowed, return `403 { error: "Origin not allowed" }`.
- For preflight: helper responds before hitting handler.

## Admin UI

Project settings form:
- Add "Allowed origins" textarea (one origin per line). Saved as string array.
- Add helper text linking to docs.

New project form:
- Optional textarea for initial allowed origins.

## Docs & comms

- Docs `/docs/concepts` + `/docs/api/projects` + `/docs/integration` mention the allowlist and how to configure it.
- README: mention allowed origins in features + API table.
- `public/llms.txt` + `/llms-full.txt` updated to mention the CORS allowlist.

## Testing plan

- Admin UI still works (same-origin bypass).
- Browser request from allowed origin → success + `Access-Control-Allow-Origin` header.
- Browser request from disallowed origin → `403`.
- Preflight (OPTIONS) returns `204` with headers.
- Server-to-server (no Origin header) unaffected.
