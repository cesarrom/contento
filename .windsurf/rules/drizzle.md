---
description: Drizzle ORM database workflow rules
---

## Drizzle ORM Rules

1. **Always use `pnpm db:generate`** after any schema change (`src/lib/db/schema.ts`). This creates the SQL migration files in `drizzle/` — never skip this step.

2. **Always use `pnpm db:migrate`** to apply migrations to the database. Never use `pnpm db:push` in this project — push bypasses migration files and is not safe for production.

3. Migration files in `drizzle/` are source-controlled. Commit them alongside schema changes.

4. The Drizzle config is at `drizzle.config.ts` in the repo root.

5. Schema lives at `src/lib/db/schema.ts`. Keep all table definitions there.
