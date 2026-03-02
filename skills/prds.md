---
description: PRDs are required for user-facing units of work
---

# PRDs (Required)

## Purpose

PRDs (Product Requirement Documents) capture the intent, scope, and user impact of a change.
They are the durable reference for reviewers and future contributors.

## Requirement

For any user-facing unit of work (UI/UX, behavior, API, ops), the change must have a PRD:

- Create a new PRD in `./prds/`, or
- Update an existing PRD if the work is an iteration.

PRs must link to the relevant PRD.

## Naming convention

- `prds/[datetime]-[short-name].prd.md`

Recommended datetime formats:

- `YYYY-MM-DDThhmm` (local time)
- `YYYY-MM-DD` (date only)

## What goes in a PRD

- Goals / non-goals
- User stories and UX notes
- Proposed solution (high-level)
- Risks and tradeoffs
- Rollout plan
- Testing plan

## When a PRD is NOT required

- Typos
- Small refactors with zero behavior change
- Dependency bumps (unless they change runtime behavior)
