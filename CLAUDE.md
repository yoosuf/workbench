# Workbench Project Instructions

Guidelines for working on the Universal Database Workbench codebase.

## Project Identity

**Name:** Universal Database Workbench
**Type:** Full-stack monorepo SaaS application
**Purpose:** Multi-database (PostgreSQL/MySQL/MSSQL) management platform with visual schema design
**Current Version:** 0.1.0
**Status:** Active Development

## Tech Stack Guidelines

### Backend (NestJS + GraphQL)
When working with backend code:
- Use NestJS modules pattern (module → service → resolver)
- Always implement services with dependency injection
- Prefer `@Injectable()` decorated services
- Use DTOs for input validation
- Keep resolvers thin and delegate to services
- Use Prisma `PrismaService` for database access

**Example patterns:**
```typescript
// ✅ Correct
@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}
}

// ❌ Avoid
export class MyService {
  private prisma = new PrismaService();
}
```

### Frontend (React + Vite)
When working with frontend code:
- Use React functional components exclusively
- Always add TypeScript interfaces (or type aliases) for props
- Use React hooks for state management
- Prefer Zustand for global state
- Use Apollo Client with `useQuery`, `useMutation`, `useSubscription`
- Keep components focused and composable
- Handle loading and error states
- Mark deliberately fire-and-forget async calls (e.g. `navigate()`, `refetch()` inside a
  non-async handler) with `void` rather than leaving them as bare unawaited expressions —
  `@typescript-eslint/no-floating-promises` is `error` for this repo and will catch genuine
  missing-`await` bugs precisely because the intentional cases are explicitly marked

**Example patterns:**
```typescript
// ✅ Correct
interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  const [state, setState] = useState('');
  return <div>{title}</div>;
};

// ❌ Avoid
export const MyComponent = (props) => {
  // No type safety
};
```

### Database (Prisma + PostgreSQL/MySQL/MSSQL)
When working with database code:
- Edit `apps/api/prisma/schema.prisma` for schema changes, then run `pnpm db:migrate`
- Use Prisma for the app's own database (users, workspaces, connections, permissions)
- Use `@workbench/db-drivers`' `createDbDriver(engine)` for talking to *target* databases
  (the user-connected PostgreSQL/MySQL/MSSQL instances being browsed/queried) — Prisma is not
  involved there
- Each driver caches a long-lived connection pool per saved connection (`pool-cache.ts`) rather
  than reconnecting per call — read that file before changing driver internals or adding a
  fourth engine
- Add indexes for frequently queried columns; document complex relationships

## Module Organization

### Backend Modules
Real modules today: `connection-manager`, `identity-access`, `notification-hub`,
`schema-inspector`, `sql-engine`, `system-health`, `tenancy`, `visual-designer`
(`apps/api/src/modules/`). Each follows:
```
modules/feature-name/
├── feature-name.module.ts        # Module definition
├── feature-name.service.ts       # Business logic
├── feature-name.resolver.ts      # GraphQL endpoints
├── dto/
│   ├── create-feature.input.ts
│   └── update-feature.input.ts
└── entities/
    └── feature.entity.ts
```

### Frontend Components
Organize components by feature under `apps/web/src/components/`: `common/`, `diagram/`,
`editor/`, `notifications/`, `schema/`, `ui/` (base library), `workspace/`.

## Code Style & Standards

### TypeScript
- `strict: true` everywhere (see `tsconfig.base.json`)
- Avoid `any` without justification — `@typescript-eslint/no-explicit-any` is a warning, not
  banned outright, but prefer a real type or a local interface for a query row shape
- Use `const` by default, `let` only when reassigned (ESLint's `prefer-const` enforces this)
- This repo has both `interface` and `type` in use; either is fine — don't create a pointless
  `interface Foo extends Bar {}` wrapper with no added members (use `type Foo = Bar` instead,
  per `@typescript-eslint/no-empty-object-type`)

### Naming Conventions
- **Files:** kebab-case (`my-file.ts`), **Components:** PascalCase (`MyComponent.tsx`)
- **Classes:** PascalCase, **Functions:** camelCase, **Constants:** UPPER_SNAKE_CASE
- **Hooks:** camelCase with `use` prefix (`useMyHook.ts`)

## Linting, Formatting, Type-Checking

Real, working commands (all wired through `eslint.config.mjs` at the repo root):
```bash
pnpm lint          # ESLint across apps/api, apps/web, packages/db-drivers, packages/shared-types
pnpm format        # Prettier — write
pnpm format:check  # Prettier — check only
pnpm type-check    # tsc --noEmit across every package
```
`no-floating-promises` and `no-misused-promises` are `error` for `apps/api/src`,
`apps/web/src`, and `packages/*/src` — they catch real missing-`await` bugs. When a call is
deliberately fire-and-forget, mark it with `void` rather than disabling the rule.

**Current testing status:** no Jest/Vitest unit-test framework is installed yet — `pnpm test`
is a no-op. The one real automated check is `packages/db-drivers/test/driver.test.ts`, a live
integration script exercising all three drivers against the docker-compose target databases:
```bash
docker compose up -d target-postgres target-mysql target-mssql
pnpm --filter @workbench/db-drivers test:integration
```

## Commit Standards

Follow Conventional Commits: `type(scope): subject` — types: feat, fix, docs, style, refactor,
perf, test, chore.

## Security Guidelines

- JWT auth via Passport (`@UseGuards(JwtAuthGuard)` on protected resolvers)
- Validate input with DTOs + `class-validator`
- Prisma parameterizes queries for the app DB; **the `@workbench/db-drivers` layer does not** —
  it builds raw SQL/T-SQL strings for DDL and schema introspection against arbitrary target
  databases, so identifiers there go through `validateIdentifier()` (alphanumeric/`_$.-` only)
  and every driver method takes `config`/schema/table as separate parameters, never
  string-concatenated user SQL. Keep that pattern when touching driver code.
- Never log passwords or tokens; connection credentials are AES-256-GCM encrypted at rest
  (`core/security/encryption.service.ts`)

## Performance Notes

- Target-database calls go through the pooled `@workbench/db-drivers` layer (see above) — don't
  reintroduce a connect-per-call pattern
- Use DataLoader for batching GraphQL field resolution across multiple tables/rows
  (`schema-inspector/dataloaders/table-metadata.loader.ts` is the existing example)
- Frontend: the production bundle is a single ~860KB JS chunk (Vite warns on this) — code-splitting
  with `React.lazy()` is an open opportunity, not yet done

## File Locations Reference

| Purpose | Location |
|---------|----------|
| API entry | `apps/api/src/main.ts` |
| Backend modules | `apps/api/src/modules/` |
| Database schema (app DB) | `apps/api/prisma/schema.prisma` |
| Target-DB driver layer | `packages/db-drivers/src/` |
| React components | `apps/web/src/components/` |
| GraphQL queries | `apps/web/src/graphql/` |
| State stores | `apps/web/src/stores/` |
| Shared types | `packages/shared-types/src/` |
| Project skill reference | `.claude/skills/workbench/SKILL.md` |

## Other Docs

- **README.md** — project overview and quick start
- **ARCHITECTURE.md** — system design and module overview
- **DEVELOPMENT.md** — day-to-day workflow
- **PROJECT_DISCOVERY.md** — codebase navigation
- **SETUP.md** — detailed environment setup
- **CONTRIBUTING.md** — contribution guidelines

## Important Reminders

- ✅ Run `pnpm lint` and `pnpm type-check` before considering a change done
- ✅ Format with Prettier (`pnpm format`)
- ✅ Add TypeScript types; avoid unjustified `any`
- ✅ Handle errors — don't add empty `catch {}` blocks that swallow failures silently
- ❌ Never commit `.env` files or hardcode secrets
- ❌ Never bypass the `@workbench/db-drivers` identifier validation when adding new driver SQL
