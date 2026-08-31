# Development Guide

This guide covers the day-to-day development workflow, best practices, and common tasks in the Universal Database Workbench.

## Environment Setup

### Prerequisites
- **Node.js** 18+ (check with `node --version`)
- **pnpm** 10+ (install with `npm install -g pnpm`)
- **Docker & Docker Compose** (for database services)
- **Git** for version control

### Initial Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd workbench
   pnpm install
   ```

2. **Create environment files**
   ```bash
   # Create .env file for API
   cat > apps/api/.env << EOF
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5431/workbench_app"
   JWT_SECRET="your-secret-key-change-in-production"
   NODE_ENV="development"
   PORT=4000
   EOF
   ```

3. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

4. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

The application is now available at:
- Frontend: http://localhost:5173
- API GraphQL: http://localhost:4000/graphql

## Development Workflow

### Working on Features

#### 1. Create a Feature Branch
```bash
git checkout -b feature/connection-improvements
```

#### 2. Identify Which Package(s) to Modify

- **Backend only**: Changes to `apps/api/`
- **Frontend only**: Changes to `apps/web/`
- **Both**: Coordinate changes across both
- **Shared utilities**: Update `packages/db-drivers/` or `packages/shared-types/`

#### 3. Make Changes

Each package maintains its own structure:

**Backend API Change**:
```bash
# Edit module files
# apps/api/src/modules/connection-manager/connection-manager.resolver.ts
# apps/api/src/modules/connection-manager/connection-manager.service.ts
# apps/api/prisma/schema.prisma (if schema changes)
```

**Frontend Component Change**:
```bash
# Edit component files
# apps/web/src/components/diagram/SchemaVisualization.tsx
# apps/web/src/graphql/connections.ts (if new queries needed)
# apps/web/src/stores/connectionStore.ts (if state changes)
```

#### 4. Test Your Changes

```bash
# Run tests for modified package
pnpm --filter api test
pnpm --filter web test

# Run linting
pnpm lint

# Manual testing in browser/GraphQL playground
# Frontend: http://localhost:5173
# GraphQL: http://localhost:4000/graphql
```

#### 5. Commit Changes

```bash
git add .
git commit -m "feat(connection-manager): improve connection validation"
```

Follow [commit conventions](#commit-conventions).

#### 6. Push and Create PR

```bash
git push -u origin feature/connection-improvements
# Create PR on GitHub
```

### Database Migrations

When modifying the Prisma schema:

```bash
# 1. Edit schema.prisma
vim apps/api/prisma/schema.prisma

# 2. Create and run migration
pnpm db:migrate

# 3. This will:
#    - Create a migration file
#    - Apply changes to database
#    - Generate Prisma client

# 4. Verify changes
pnpm db:studio  # Opens Prisma Studio UI

# 5. Commit migration files
git add apps/api/prisma/
git commit -m "chore(db): add user preferences table"
```

### Adding a New Backend Module

Example: Adding a new "Analytics" module

```bash
# 1. Create module structure
mkdir -p apps/api/src/modules/analytics
cd apps/api/src/modules/analytics

# 2. Create base files
touch analytics.module.ts
touch analytics.service.ts
touch analytics.resolver.ts
touch analytics.dto.ts

# 3. Create analytics.module.ts
cat > analytics.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResolver } from './analytics.resolver';

@Module({
  providers: [AnalyticsService, AnalyticsResolver],
})
export class AnalyticsModule {}
EOF

# 4. Create analytics.service.ts
cat > analytics.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getQueryStats() {
    // Business logic here
  }
}
EOF

# 5. Create analytics.resolver.ts
cat > analytics.resolver.ts << 'EOF'
import { Resolver, Query } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';

@Resolver('Analytics')
export class AnalyticsResolver {
  constructor(private service: AnalyticsService) {}

  @Query()
  async queryStats() {
    return this.service.getQueryStats();
  }
}
EOF

# 6. Import in app.module.ts
# Add to imports array: AnalyticsModule
```

### Adding a New Frontend Component

Example: Adding a new "ConnectionStatus" component

```bash
# 1. Create component
mkdir -p apps/web/src/components/status
touch apps/web/src/components/status/ConnectionStatus.tsx

# 2. Create component file
cat > apps/web/src/components/status/ConnectionStatus.tsx << 'EOF'
import React from 'react';
import { useQuery } from '@apollo/client';
import { CONNECTION_STATUS_QUERY } from '../../graphql/connections';

interface ConnectionStatusProps {
  connectionId: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connectionId }) => {
  const { data, loading } = useQuery(CONNECTION_STATUS_QUERY, {
    variables: { connectionId },
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${data?.connection.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {data?.connection.isActive ? 'Connected' : 'Disconnected'}
    </div>
  );
};
EOF

# 3. Create or update GraphQL query
# Add to apps/web/src/graphql/connections.ts
```

### Working with GraphQL

#### Testing GraphQL Queries

1. **Via GraphQL Playground**: http://localhost:4000/graphql
2. **Copy-paste test queries**:
   ```graphql
   query GetConnections {
     connections {
       id
       name
       type
     }
   }
   ```

#### Adding a New Mutation

1. **Update resolver** (`apps/api/src/modules/*/resolver.ts`):
   ```typescript
   @Mutation()
   async createConnection(@Args('input') input: CreateConnectionInput) {
     return this.service.create(input);
   }
   ```

2. **Add GraphQL query file** (`apps/web/src/graphql/connections.ts`):
   ```typescript
   export const CREATE_CONNECTION = gql`
     mutation CreateConnection($input: CreateConnectionInput!) {
       createConnection(input: $input) {
         id
         name
       }
     }
   `;
   ```

3. **Use in component**:
   ```typescript
   const [createConnection, { loading }] = useMutation(CREATE_CONNECTION);

   const handleCreate = async () => {
     const result = await createConnection({
       variables: { input: { name: 'My DB' } },
     });
   };
   ```

### State Management

#### Using Zustand for Global State

1. **Create store** (`apps/web/src/stores/myStore.ts`):
   ```typescript
   import { create } from 'zustand';

   interface MyStore {
     selectedId: string | null;
     setSelectedId: (id: string | null) => void;
   }

   export const useMyStore = create<MyStore>((set) => ({
     selectedId: null,
     setSelectedId: (id) => set({ selectedId: id }),
   }));
   ```

2. **Use in components**:
   ```typescript
   function MyComponent() {
     const { selectedId, setSelectedId } = useMyStore();

     return (
       <div>
         <p>Selected: {selectedId}</p>
         <button onClick={() => setSelectedId('123')}>Select</button>
       </div>
     );
   }
   ```

### Debugging

#### Backend Debugging

1. **Console logging**:
   ```typescript
   // In service
   this.logger.log('Creating connection', { type, host });
   this.logger.error('Connection failed', error);
   ```

2. **VS Code Debugger**:
   ```json
   // Add to .vscode/launch.json
   {
     "type": "node",
     "request": "attach",
     "name": "NestJS Debugger",
     "port": 9229,
     "restart": true,
     "preLaunchTask": "npm: dev"
   }
   ```

3. **GraphQL Playground Debugging**:
   - Use built-in debugger at http://localhost:4000/graphql
   - Write queries and inspect responses

#### Frontend Debugging

1. **React DevTools**:
   - Install React DevTools Chrome extension
   - Inspect component props and state

2. **Apollo DevTools**:
   - Install Apollo DevTools Chrome extension
   - Inspect GraphQL cache and queries

3. **Browser Console**:
   ```javascript
   // Access Zustand store
   console.log(useMyStore.getState());
   ```

### Performance Optimization

#### Backend
- Use DataLoader to batch database queries
- Add query indexes to frequently queried columns
- Implement result pagination for large datasets
- Use Redis for caching (future enhancement)

#### Frontend
- Code split with React.lazy()
- Memoize expensive computations
- Use Apollo Client caching effectively
- Profile with React Profiler

## Testing

> **Current status:** no automated unit-test framework (Jest/Vitest) is installed yet — `pnpm test`
> is a no-op today. The one real automated check is `packages/db-drivers/test/driver.test.ts`, a
> live-integration script that exercises all three drivers against the docker-compose target
> databases (run with `pnpm --filter @workbench/db-drivers test:integration` after
> `docker compose up -d target-postgres target-mysql target-mssql`). The examples below show the
> intended conventions for when a real test framework is added — don't expect `pnpm test` to run
> them yet.

### Running Tests (once a test framework is added)

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter api test
pnpm --filter web test

# Run with coverage
pnpm test -- --coverage

# Run in watch mode
pnpm test -- --watch
```

### Writing Tests

#### Backend Test Example
```typescript
// connection-manager.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConnectionManagerService } from './connection-manager.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('ConnectionManagerService', () => {
  let service: ConnectionManagerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConnectionManagerService,
        {
          provide: PrismaService,
          useValue: { connection: { create: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get(ConnectionManagerService);
    prisma = module.get(PrismaService);
  });

  it('should create a connection', async () => {
    const result = await service.create({ name: 'Test' });
    expect(prisma.connection.create).toHaveBeenCalled();
  });
});
```

#### Frontend Test Example
```typescript
// ConnectionStatus.test.tsx
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ConnectionStatus } from './ConnectionStatus';
import { CONNECTION_STATUS_QUERY } from '../../graphql/connections';

const mocks = [
  {
    request: { query: CONNECTION_STATUS_QUERY },
    result: { data: { connection: { id: '1', isActive: true } } },
  },
];

it('renders connection status', async () => {
  render(
    <MockedProvider mocks={mocks}>
      <ConnectionStatus connectionId="1" />
    </MockedProvider>,
  );

  expect(await screen.findByText('Connected')).toBeInTheDocument();
});
```

## Code Quality

### Linting

```bash
# Run ESLint
pnpm lint

# Fix auto-fixable issues
pnpm lint -- --fix
```

### Formatting

```bash
# Format code with Prettier
pnpm format

# Check formatting
pnpm format -- --check
```

### Type Checking

```bash
# Type check all TypeScript files
pnpm type-check
```

## Commit Conventions

Follow Conventional Commits:

```
type(scope): subject

body

footer
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **refactor**: Code refactoring (no behavior change)
- **perf**: Performance improvement
- **test**: Test changes
- **chore**: Build, dependencies, etc.

### Examples
```bash
git commit -m "feat(connection-manager): add connection validation"
git commit -m "fix(schema-inspector): handle null column defaults"
git commit -m "docs: update architecture guide"
git commit -m "chore(deps): update prisma to 6.5.0"
```

## Useful Commands Reference

### Development
```bash
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm format           # Format with Prettier
```

### Database
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Create and run migration
pnpm db:studio        # Open Prisma Studio
```

### Individual Workspace
```bash
pnpm --filter api dev           # Start API only
pnpm --filter web build         # Build web only
pnpm --filter db-drivers test   # Test drivers package
```

### Turbo
```bash
turbo run build --parallel      # Parallel build
turbo run test                  # Run tests with caching
turbo graph                     # View task graph
turbo prune --scope=api         # Prune dependencies
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check Docker containers
docker-compose ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Module Resolution Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Regenerate Prisma client
pnpm db:generate
```

### GraphQL Schema Out of Sync
```bash
# Rebuild API
pnpm --filter api build

# Regenerate TypeScript types
pnpm db:generate
```

## Performance Tips

### Build Time
- Use `turbo run build --parallel` for faster builds
- Cache is stored in `.turbo/`

### Development Iteration
- Use watch mode: `pnpm --filter api dev`
- Use HMR on frontend: automatic with Vite
- Keep dev terminal visible for hot reload feedback

### Database Queries
- Use DataLoader for batch queries
- Add indexes to frequently queried columns
- Monitor slow queries in Prisma logs

## Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Review [PROJECT_DISCOVERY.md](./PROJECT_DISCOVERY.md) for codebase navigation
3. Check [CONTRIBUTING.md](./CONTRIBUTING.md) for collaboration guidelines

---

Happy coding! 🚀
