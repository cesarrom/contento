# Roadmap

Contento is at v0.1.0. Done so far: uploads, signed URLs, image/audio/video transformations, the backend-only `/f/*` delivery routes, per-project CORS allowlists and the admin UI. This file lists what comes next, in rough priority order. Product requirement docs live in [`prds/`](prds/); architecture is in [`PLAN.md`](PLAN.md) and the docs plan in [`DOCS_PLAN.md`](DOCS_PLAN.md).

## Next

- [ ] **AI-friendly documentation** (PRD, in progress): docs that an application developer or a coding agent can integrate against without guessing.
- [ ] **Automated tests**: there are none yet. Start with API integration tests for projects, API keys, files and signed URLs, then run them in CI next to CodeQL and the Docker build.
- [ ] **Design system** (PRD): one set of semantic tokens, light and dark, shared by the landing page, docs and admin.

## Later

- [ ] **Media transformation hardening**: queue limits, retries and failure reporting for the FFmpeg worker; size and time limits on image transforms.
- [ ] **Per-project quotas and usage**: storage and bandwidth counters in the admin UI, with configurable limits.
- [ ] **Upload lifecycle**: expiring uploads, cleanup of orphaned objects, and optional checksums.
- [ ] **Release process**: tagged releases, a changelog, and published image versions.
