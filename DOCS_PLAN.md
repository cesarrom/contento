# Contento — Docs & Landing Plan

## Decision: Fumadocs

### Why not the alternatives

| Option | Problem |
|---|---|
| **Nextra** | Requires its own Next.js app or heavily wraps the config. Fights with existing routes. |
| **Raw `@next/mdx`** | Full control but you hand-roll sidebar, search, prev/next links. Maintenance burden grows. |
| **Contentlayer** | Deprecated/unmaintained as of 2024. |
| **Velite** | Good alternative to Contentlayer but adds another build tool with less ecosystem. |
| **Fumadocs** | ✅ Built for App Router. MDX files ARE routes. Sidebar from file tree. Orama search. No conflicts with existing routes. |

### The "NestJS decorator" equivalent in Fumadocs

In NestJS you annotate controllers:
```ts
@ApiOperation({ summary: 'Upload a file' })
@ApiResponse({ status: 200, type: UploadResponseDto })
```

In Fumadocs you annotate MDX pages with frontmatter:
```mdx
---
title: Upload a File
description: Generate a presigned upload URL for a project bucket
---
```

The file lives at `src/app/docs/api/sign-upload.mdx` — right alongside the actual route at
`src/app/api/v1/projects/[id]/sign/upload/route.ts`. Extending docs = adding an MDX file.
Removing a feature = deleting its MDX file. Renaming = rename the file.

---

## Route structure

```
src/app/
├── (marketing)/          # Route group — no layout impact on /admin or /api
│   ├── layout.tsx        # Marketing layout (nav, footer)
│   ├── page.tsx          # Landing page  →  /
│   └── docs/
│       ├── layout.tsx    # Fumadocs layout (sidebar, search, TOC)
│       ├── page.tsx      # Docs home  →  /docs
│       └── [[...slug]]/
│           └── page.tsx  # Renders any MDX file  →  /docs/*
│
├── admin/                # Unchanged
├── api/                  # Unchanged
├── f/                    # Unchanged
└── layout.tsx            # Root layout (Sonner only, no nav)

content/                  # MDX source files (outside src/ for clarity)
├── docs/
│   ├── meta.json         # Sidebar order + groups
│   ├── index.mdx         # Overview
│   ├── quick-start.mdx
│   ├── concepts.mdx
│   ├── api/
│   │   ├── meta.json
│   │   ├── authentication.mdx
│   │   ├── projects.mdx
│   │   ├── api-keys.mdx
│   │   ├── files.mdx
│   │   ├── sign-upload.mdx
│   │   ├── sign-read.mdx
│   │   └── delivery.mdx    # /f/ route — transformations
│   └── self-hosting/
│       ├── meta.json
│       ├── docker-compose.mdx
│       ├── environment.mdx
│       └── migrations.mdx
```

### Why `content/` outside `src/app/`?

Fumadocs processes MDX at build time via `fumadocs-mdx` (a Vite plugin configured in
`next.config.ts`). The content directory is a source-of-truth for docs prose, decoupled from
the app routing layer. The `[[...slug]]` catch-all renders whichever MDX file matches the URL.

This means:
- **Add a new endpoint** → add `content/docs/api/my-endpoint.mdx`
- **Remove a feature** → delete its `.mdx` file
- **Reorder sidebar** → edit `meta.json`
- **No code changes needed** to the rendering infrastructure

---

## Landing page sections

1. **Hero** — tagline, "Get started" CTA → `/docs`, "Admin UI" → `/admin`
2. **Features grid** — Projects, API keys, Image transforms, Video/audio, Signed URLs, SSO
3. **How it works** — 3-step: Upload → Sign URL → Deliver with transforms
4. **Self-hosting callout** — Docker Compose one-liner
5. **API quick-look** — code snippet of a signed upload flow

---

## Implementation steps

1. Install `fumadocs-core fumadocs-ui fumadocs-mdx`
2. Configure `next.config.ts` with `fumadocs-mdx` Vite plugin
3. Create `source.config.ts` — define the content collection
4. Create `src/lib/source.ts` — export the `loader()` for the docs collection
5. Create `(marketing)/layout.tsx` — shared marketing nav + footer
6. Create `(marketing)/page.tsx` — landing page
7. Create `(marketing)/docs/layout.tsx` — Fumadocs `DocsLayout`
8. Create `(marketing)/docs/[[...slug]]/page.tsx` — renders MDX via `DocsPage`
9. Write initial MDX content files in `content/docs/`
10. Update `src/app/page.tsx` — stop redirecting to `/admin`, show landing instead
11. Update `src/proxy.ts` — ensure `/docs` and `/` are not guarded

---

## Public vs private routes

| Path | Auth required |
|---|---|
| `/` | ❌ public |
| `/docs/*` | ❌ public |
| `/admin/*` | ✅ Authentik SSO |
| `/api/v1/*` | ✅ API key (scoped) |
| `/f/:slug/*` | ✅ or ❌ per project visibility |

The proxy already only guards `/admin/:path*` — docs and landing are naturally public.
