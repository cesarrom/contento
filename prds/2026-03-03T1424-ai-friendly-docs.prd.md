# PRD: AI-Friendly Documentation

**Date:** 2026-03-03  
**Status:** In progress  

---

## Problem

Contento is a developer integration product. Its primary users — after setup — are **applications and the developers (or AI agents) integrating it**. An agent asked "how do I upload a file to Contento?" or "how do I get a signed URL for a private image?" should be able to read the docs and produce working code.

Currently the docs are:
- Human-readable MDX rendered through Fumadocs
- Structured correctly but missing a **curated machine-consumable entrypoint**
- Missing a dedicated **integration cookbook** (the most critical gap for agents)
- Not serving **raw Markdown** versions of pages that agents can fetch reliably

## Goals

1. Any AI agent that can browse or fetch URLs should be able to learn Contento's integration API from a single starting point.
2. Every docs page is available as plain Markdown (not rendered HTML).
3. A full-text dump of all docs is available at a stable URL for RAG/embedding.
4. The integration cookbook covers all key flows with copy-pasteable curl + TypeScript examples.
5. No separate tooling or SDK required — pure HTTP examples first.

## Non-Goals

- MCP server / "skill" packaging (Phase 4, out of scope for this PRD)
- OpenAPI spec generation (follow-up PRD)
- Semantic search / Ask AI widget

---

## Implementation Plan

### Phase 1: Machine-consumable entrypoints

**1a. `/llms.txt`**  
- Static file at `public/llms.txt` (served by Next.js automatically)
- Follows the `llmstxt.org` spec: `# Contento`, blockquote summary, H2 sections with URL lists
- Sections: Concepts, Integration flows, API Reference, Self-hosting
- Only links to the pages that matter for integration (not self-hosting fluff)
- Also lists `/llms-full.txt` and the `*.mdx` access pattern

**1b. `/llms-full.txt`**  
- Next.js route handler at `src/app/llms-full.txt/route.ts`
- Uses `source.getPages()` + Fumadocs' `getLLMText()` helper to concatenate all docs pages
- `revalidate = false` (static, cached forever at build)
- Returns `Content-Type: text/plain`

**1c. `*.mdx` raw access per page**  
- Route handler at `src/app/llms.mdx/docs/[[...slug]]/route.ts`
- Returns raw Markdown for a single docs page via `getLLMText(page)`
- `Content-Type: text/markdown`
- Next.js rewrite: `/docs/:path*.mdx` → `/llms.mdx/docs/:path*`
- Also: Accept-header negotiation in `src/proxy.ts` middleware using `fumadocs-core/negotiation`

### Phase 2: Integration cookbook (new docs section)

New folder `content/docs/integration/` with:

- `index.mdx` — Overview: what "integrating Contento" means, auth model, concepts for integration
- `upload.mdx` — Full upload flow: `sign/upload` → `PUT` to backend proxy. curl + TS.
- `read-public.mdx` — Public file delivery: direct `/f/raw/...` and `/f/image/...` with transforms
- `read-private.mdx` — Private file delivery: `sign/read` → fetch signed URL. curl + TS.
- `transforms.mdx` — All transform params by kind (image/audio/video), with examples
- `errors.mdx` — All error codes (401/403/404/410/502), causes, fixes

Also update:
- `content/docs/api/projects.mdx` — add `deliveryCacheEnabled` + `deliveryCacheTtlSeconds` to PATCH docs

### Phase 3: Update nav

- Add `"integration"` to `content/docs/meta.json` pages array
- Create `content/docs/integration/meta.json` with ordered pages

---

## File Change Summary

| File | Action |
|---|---|
| `public/llms.txt` | Create |
| `src/app/llms-full.txt/route.ts` | Create |
| `src/app/llms.mdx/docs/[[...slug]]/route.ts` | Create |
| `next.config.ts` | Add rewrite `/docs/:path*.mdx` → `/llms.mdx/docs/:path*` |
| `src/proxy.ts` | Add Accept-header negotiation for `text/markdown` |
| `content/docs/integration/meta.json` | Create |
| `content/docs/integration/index.mdx` | Create |
| `content/docs/integration/upload.mdx` | Create |
| `content/docs/integration/read-public.mdx` | Create |
| `content/docs/integration/read-private.mdx` | Create |
| `content/docs/integration/transforms.mdx` | Create |
| `content/docs/integration/errors.mdx` | Create |
| `content/docs/api/projects.mdx` | Update PATCH docs |
| `content/docs/meta.json` | Add `"integration"` to pages |
