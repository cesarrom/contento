# Contributing

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
