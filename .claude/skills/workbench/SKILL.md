---
name: workbench
description: Reference for this repo — the Universal Database Workbench (NestJS + GraphQL + React monorepo managing PostgreSQL/MySQL/MSSQL connections). Use when developing features, debugging, or navigating this codebase.
---

# Universal Database Workbench - Skill Guide

## Overview

This skill covers the **Universal Database Workbench**, a comprehensive database management platform. Use this skill when:

- **Developing features** in the workbench (frontend, backend, or both)
- **Debugging** application issues
- **Understanding** the codebase architecture and structure
- **Setting up** the development environment
- **Contributing** to the project
- **Deploying** or scaling the platform
- **Optimizing** performance

## Project Context

### What Is It?
A monorepo-based SaaS application for managing multiple databases (PostgreSQL, MySQL, MSSQL) with a visual schema designer, real-time collaboration, and enterprise features like workspaces and team management.

### Tech Stack

**Backend:**
- NestJS 11 (GraphQL, dependency injection, modular architecture)
- Apollo Server (GraphQL API)
- Prisma 6 (ORM, type safety)
- JWT authentication (Passport.js)

**Frontend:**
- React 18 (TypeScript, functional components)
- Vite (fast build tool)
- Apollo Client (GraphQL client)
- Zustand (state management)
- Tailwind CSS 4 (styling)
- Radix UI (accessible components)
- Monaco Editor (code editing)

**Infrastructure:**
- Turbo (monorepo orchestration)
- pnpm (workspace package manager)
- Docker & Docker Compose (containerization)
- Prisma (database migrations)

### Project Structure

```
workbench/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/modules/  # Feature modules
│   │   └── prisma/       # Database schema
│   └── web/              # React frontend
│       └── src/
│           ├── components/
│           ├── graphql/
│           └── stores/
├── packages/
│   ├── db-drivers/       # Multi-database abstraction
│   └── shared-types/     # Shared TypeScript types
└── Documentation files (README.md, ARCHITECTURE.md, etc.)
```

## Key Skills & Patterns

### Backend Development

#### NestJS Module Pattern
Each feature is a self-contained module:
- **Module**: Organizes imports and provides services
- **Service**: Contains business logic
- **Resolver**: Exposes GraphQL endpoints
- **DTO**: Input validation
- **Entity**: Database model

**Example Structure:**
```
modules/connection-manager/
├── connection-manager.module.ts
├── connection-manager.service.ts
├── connection-manager.resolver.ts
├── dto/create-connection.input.ts
└── entities/connection.entity.ts
```

#### GraphQL Resolvers
```typescript
@Resolver('Connection')
export class ConnectionResolver {
  @Query()
  async connections() { /* return all */ }
  
  @Mutation()
  async createConnection(@Args('input') input: CreateConnectionInput) { /* create */ }
  
  @Subscription()
  connectionStatusChanged() { /* broadcast */ }
}
```

#### Dependency Injection
NestJS uses constructor injection:
```typescript
@Injectable()
export class ConnectionService {
  constructor(private prisma: PrismaService) {}
  
  async create(input) {
    return this.prisma.connection.create({ data: input });
  }
}
```

### Frontend Development

#### React Component Pattern
Functional components with hooks:
```typescript
interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  const { data, loading } = useQuery(QUERY);
  
  return <div>{title}</div>;
};
```

#### GraphQL Integration
Apollo Client for queries/mutations/subscriptions:
```typescript
const { data, loading, error } = useQuery(CONNECTIONS_QUERY);
const [createConnection] = useMutation(CREATE_CONNECTION);
```

#### State Management
Zustand stores for global state:
```typescript
export const useConnectionStore = create((set) => ({
  connections: [],
  setConnections: (list) => set({ connections: list }),
}));
```

### Database Abstraction

#### Multi-Database Support
The `db-drivers` package abstracts PostgreSQL, MySQL, and MSSQL:
- Factory pattern for driver creation (`createDbDriver(engine)`)
- Common `DbDriver` interface for all three engines
- Each driver caches a long-lived connection pool per saved connection (`pool-cache.ts`)
  instead of reconnecting on every call — see that file before changing driver internals
- Query normalization and error handling (`DriverError` with an engine-specific `code`)

#### Prisma ORM
Type-safe database access with auto-generated client:
- Schema defined in `apps/api/prisma/schema.prisma`
- Migrations managed automatically
- Type-safe queries in code

## Development Workflow

### Starting Development
```bash
# Install dependencies
pnpm install

# Start Docker services
docker-compose up -d

# Initialize database
pnpm db:migrate

# Start dev servers
pnpm dev
```

### Making Changes

**Backend Feature:**
1. Create/update module in `apps/api/src/modules/`
2. Update Prisma schema if needed (`apps/api/prisma/schema.prisma`)
3. Run migration: `pnpm db:migrate`
4. Test with GraphQL Playground: `http://localhost:4000/graphql`

**Frontend Feature:**
1. Create component in `apps/web/src/components/`
2. Add GraphQL query in `apps/web/src/graphql/`
3. Integrate with component using Apollo Client
4. Test in browser: `http://localhost:5173`

**Shared Types:**
1. Update types in `packages/shared-types/src/index.ts`
2. Use in backend: `import { MyType } from '@workbench/shared-types'`
3. Use in frontend: same import path

### Testing
No Jest/Vitest unit-test framework is installed yet — `pnpm test` is currently a no-op. The one
real automated check is a live-integration script for the DB drivers:
```bash
pnpm --filter @workbench/db-drivers test:integration  # requires docker compose target-* DBs running
pnpm lint              # ESLint across api/web/db-drivers/shared-types
pnpm format            # Prettier formatting
pnpm type-check        # tsc --noEmit across all packages
```

### Database Management
```bash
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run migrations
pnpm db:studio         # Open visual DB browser
```

## Common Scenarios

### Adding a New Feature

**Scenario:** Add a new "Analytics" module to track query statistics

**Steps:**

1. **Create backend module:**
   ```bash
   mkdir apps/api/src/modules/analytics
   touch apps/api/src/modules/analytics/{module,service,resolver}.ts
   ```

2. **Implement service and resolver:**
   ```typescript
   // analytics.service.ts
   @Injectable()
   export class AnalyticsService {
     async getQueryStats() { /* logic */ }
   }
   
   // analytics.resolver.ts
   @Resolver()
   export class AnalyticsResolver {
     @Query()
     async queryStats() { return this.service.getQueryStats(); }
   }
   ```

3. **Register module in app.module.ts**

4. **Create frontend component:**
   ```bash
   touch apps/web/src/components/analytics/QueryStats.tsx
   ```

5. **Add GraphQL query:**
   ```typescript
   // apps/web/src/graphql/analytics.ts
   export const QUERY_STATS = gql`
     query QueryStats { queryStats { count avg } }
   `;
   ```

6. **Use in component:**
   ```typescript
   const { data } = useQuery(QUERY_STATS);
   ```

### Debugging Issues

**Frontend component not showing data:**
1. Check Apollo DevTools cache in browser
2. Verify GraphQL query in Playground: `http://localhost:4000/graphql`
3. Check component props with React DevTools
4. Verify Zustand store state: `console.log(useMyStore.getState())`

**Backend GraphQL query fails:**
1. Test query in Playground first
2. Check resolver implementation
3. Verify service logic
4. Check database schema and Prisma client
5. Review console logs: `this.logger.log()` in service

**Database migration fails:**
1. Check migration file in `apps/api/prisma/migrations/`
2. Review schema.prisma for syntax errors
3. Verify database connection
4. Reset if needed: `pnpm db:reset` (destroys all data!)

### Performance Optimization

**Backend:**
- Use DataLoader for batch queries
- Add database indexes
- Implement pagination
- Cache query results

**Frontend:**
- Code splitting: `React.lazy()`
- Memoization: `React.memo()`, `useMemo()`
- Apollo cache management
- Image optimization

## Key Files & Locations

### Backend Entry Points
- `apps/api/src/main.ts` - Bootstrap, CORS, middleware setup
- `apps/api/src/app.module.ts` - Root module imports
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/api/src/core/` - Core infrastructure

### Frontend Entry Points
- `apps/web/src/main.tsx` - React mount
- `apps/web/src/App.tsx` - Root component
- `apps/web/src/lib/apollo.ts` - Apollo Client config
- `apps/web/vite.config.ts` - Build configuration

### Configuration
- `turbo.json` - Monorepo task setup
- `pnpm-workspace.yaml` - Workspace configuration
- `tsconfig.base.json` - Base TypeScript config
- `docker-compose.yml` - Local database services

## Module Responsibilities

### Connection Manager
Handles database connections and lifecycle management.

### Identity & Access
User authentication, JWT tokens, RBAC.

### Schema Inspector
Database schema introspection and analysis.

### SQL Engine
Query execution and result streaming.

### Notification Hub
WebSocket events and real-time updates.

### Visual Designer
Schema diagrams and visualizations.

### Tenancy
Workspace and team management.

### System Health
Monitoring and diagnostics.

## Best Practices

### Code Style
- Use TypeScript everywhere
- Follow ESLint rules
- Format with Prettier
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Component Design (React)
- Keep components small and focused
- Use composition over inheritance
- Prefer hooks over HOCs
- Memoize expensive computations
- Handle loading and error states

### Service Design (NestJS)
- Keep services focused on business logic
- Use dependency injection
- Add proper error handling
- Log important operations
- Validate input with DTOs

### Database
- Use Prisma for type safety
- Add indexes for frequent queries
- Keep schemas normalized
- Document complex relationships
- Track migrations in version control

### Security
- Validate all user input
- Use JWT for authentication
- Check permissions in resolvers
- Hash passwords with bcryptjs
- Sanitize database queries (Prisma prevents SQL injection)

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| Port in use | `lsof -i :4000` then `kill -9 <PID>` |
| Docker not running | `docker-compose up -d` |
| Database connection error | Check DATABASE_URL in .env, verify Docker container |
| GraphQL query not working | Test in Playground, check resolver, verify service |
| Component not updating | Check Apollo cache, verify Zustand store, use React DevTools |
| Type errors | Run `pnpm db:generate`, check shared-types, verify imports |
| Build fails | Clear node_modules, reinstall: `rm -rf node_modules && pnpm install` |

## Useful Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all
pnpm test                   # Test all
pnpm lint                   # Lint all

# Database
pnpm db:generate           # Generate Prisma client
pnpm db:migrate            # Run migrations
pnpm db:studio             # Visual database UI

# Individual workspaces
pnpm --filter api dev      # Backend only
pnpm --filter web build    # Frontend only

# Git/CI
turbo run test --parallel  # Parallel test execution
turbo graph                # View task dependencies
```

## Documentation Files

- **README.md** - Project overview and quick start
- **ARCHITECTURE.md** - System design and data flow
- **DEVELOPMENT.md** - Development workflow guide
- **PROJECT_DISCOVERY.md** - Codebase navigation
- **SETUP.md** - Detailed setup instructions
- **CONTRIBUTING.md** - Contributing guidelines
- **SKILLS.md** - Platform capabilities

## When to Use This Skill

✅ **Use this skill when:**
- Adding features to the workbench
- Fixing bugs or debugging issues
- Understanding the codebase
- Setting up development environment
- Contributing to the project
- Optimizing performance
- Deploying or scaling

❌ **Don't use this skill for:**
- Unrelated TypeScript/React/NestJS questions
- General database theory (use when specific to workbench)
- Other projects or systems

## Interaction Tips

1. **Provide context** - Mention which module/component you're working on
2. **Be specific** - Ask about particular files or features
3. **Show error messages** - Include stack traces and console output
4. **Reference documentation** - Point to relevant doc files (README.md, ARCHITECTURE.md, etc.)
5. **Test locally first** - Try reproducing issues in development environment

## Next Steps

1. Read **README.md** for project overview
2. Follow **SETUP.md** for environment setup
3. Explore **PROJECT_DISCOVERY.md** for codebase structure
4. Check **DEVELOPMENT.md** for workflow patterns
5. Review **ARCHITECTURE.md** for system design

---

**Last Updated:** August 31, 2026  
**Project Version:** 0.1.0  
**Repository:** https://github.com/yoosuf/workbench
