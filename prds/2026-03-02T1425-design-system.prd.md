# Design System Plan

## Goals

- Make the UI feel opinionated (not default shadcn + gray), while staying consistent across:
  - Marketing (`/`)
  - Docs (`/docs`)
  - Admin (`/admin`)
- Support light + dark mode with a single token set.
- Keep styling maintainable by relying on semantic tokens instead of hardcoded grays.

## Strategy

### 1) Theme tokens (single source of truth)

We will define the application theme as CSS variables in `src/app/globals.css`:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--input`, `--ring`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`

Tailwind/shadcn consume these through the existing `@theme inline` mappings.

### 2) Palette

Brand direction: **“Deep ocean”** (teal/cyan) with a **warm contrast** accent.

- **Primary**: teal-cyan (buttons, links, highlights)
- **Secondary**: neutral surface tint
- **Accent**: warm amber (small emphasis, badges)

We’ll implement the palette via OKLCH variables for predictable contrast.

### 3) Typography

Use a recognizable, less-generic pairing:

- **Sans (UI/body)**: `Inter`
- **Mono (code/keys)**: `JetBrains Mono`
- **Display (headings/brand)**: `Fraunces`

Implementation:

- Use `next/font/google` in `src/app/layout.tsx`.
- Provide CSS variables:
  - `--font-sans`
  - `--font-mono`
  - `--font-display`

### 4) Dark mode implementation

- Use `next-themes` with `attribute="class"`.
- Dark mode is driven by applying `.dark` on `<html>`.
- Set default theme to `system`.

### 5) App-wide application (what gets updated)

We will systematically replace hardcoded grays (e.g. `text-gray-500`, `bg-zinc-950`) with semantic tokens:

- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border`

Targeted surfaces:

- Marketing header/footer + landing sections
- Admin shell (sidebar + mobile header)
- Login card

Docs layout should largely inherit token styling through the providers.

### 6) “Not generic” details

- Consistent brand heading font for hero headings
- Slightly more distinctive radii (already set via `--radius`)
- Slightly tinted background in both modes for depth

## Rollout steps

1. Add `ThemeProvider` wrapper at root.
2. Add fonts + CSS variable mapping.
3. Update the theme palette variables in `globals.css`.
4. Replace hardcoded gray/zinc classes in marketing + admin with semantic tokens.
5. Sanity pass:
   - mobile
   - light/dark
   - contrast

## Non-goals (for now)

- Rebuilding all shadcn components.
- Adding a full component library of variants.
