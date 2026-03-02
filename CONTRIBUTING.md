# Contributing

## PRDs

We keep lightweight Product Requirement Documents in `./prds/`.

Use a PRD when proposing or changing:

- User-visible behavior
- UI/UX (layout, theming, accessibility, responsiveness)
- Public APIs
- Deployment/runtime expectations

Naming convention:

- `prds/[datetime]-[short-name].prd.md`

PRs should link to the relevant PRD (or include a new one) when the change is user-facing.

See also:

- `skills/prds.md`
- `skills/design-guidelines.md`

## Development

- Package manager: `pnpm`
- Run dev server: `pnpm dev`
- Build: `pnpm build`

## Database / Drizzle

- Generate migrations after schema changes: `pnpm db:generate`
- Apply migrations: `pnpm db:migrate`
- Avoid `db:push` (migration-first workflow).

## Pull Requests

- Keep PRs focused and small
- Include screenshots for UI changes
- Include a brief testing plan

## Code Style

- TypeScript strict mode
- Prefer small, composable helpers
