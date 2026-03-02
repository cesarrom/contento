---
description: Design guidelines for theming, typography, and token usage
---

# Design Guidelines

## Goals

- Consistent UI across marketing, docs, and admin.
- Fully supports light/dark mode.
- Avoids a generic look by using a coherent palette and typography.

## Theme system (tokens)

Use semantic tokens instead of hardcoded colors:

- Backgrounds:
  - `bg-background`, `bg-card`, `bg-muted`
- Text:
  - `text-foreground`, `text-muted-foreground`
- Borders:
  - `border-border`

Theme tokens are defined in:

- `src/app/globals.css`

Dark mode is driven by `.dark` on `<html>` via `next-themes`.

## Typography

- Body/UI: `--font-sans`
- Code: `--font-mono`
- Headings/brand: `--font-display`

Use `font-[family-name:var(--font-display)]` for hero headings and brand marks.

## Palette

Primary direction is **deep ocean** (teal/cyan) with a warm accent.

- Primary should be used for:
  - primary CTAs
  - active states
  - key highlights

Avoid introducing new arbitrary brand colors unless the palette is updated in `globals.css`.

## Component practices

- Prefer shadcn components; customize through tokens and variants.
- Avoid per-page bespoke colors.
- Keep contrast readable in both themes.

## Review checklist for UI PRs

- Light mode looks correct
- Dark mode looks correct
- Mobile layout is usable
- No hardcoded `gray/zinc` utilities for core surfaces
