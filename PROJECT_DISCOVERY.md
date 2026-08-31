# Project Discovery Guide

This guide helps you navigate and understand the codebase structure, key files, and project organization.

## Quick Navigation

### Root Level
- **package.json** - Monorepo configuration, workspace scripts
- **pnpm-workspace.yaml** - pnpm workspace definition
- **turbo.json** - Turbo CI/CD task configuration
- **tsconfig.base.json** - Base TypeScript configuration
- **docker-compose.yml** - Local development database services
- **.env files** - Environment configuration (not tracked)

### Top-Level Folders

#### `/apps` - Application Packages
Main applications - frontend and backend.

#### `/packages` - Shared Packages
Reusable libraries and utilities.

#### `/docker` - Container Configuration
Database initialization scripts for development.

---

## Backend Deep Dive (apps/api)

### Entry Point
- **src/main.ts** - NestJS bootstrap, CORS config, port setup
- **src/app.module.ts** - Root module, imports all feature modules
- **nest-cli.json** - NestJS CLI configuration

### Core Directories

#### `src/core/`
**Purpose**: Core services and infrastructure

```
core/
├── common/                 # Shared utilities, constants
├── database/              # Prisma and database setup
├── feature-flags/         # Feature flag management
└── security/              # Authentication, JWT, guards
```

**Key Files**:
- `database/database.module.ts` - Prisma setup
- `security/jwt.strategy.ts` - Passport JWT strategy
- `security/jwt.guard.ts` - Route protection

#### `src/modules/`
**Purpose**: Feature-specific modules (one module per domain)

Each module typically contains:
- `*.module.ts` - Module definition
- `*.service.ts` - Business logic
- `*.resolver.ts` - GraphQL resolvers
- `*.dto.ts` - Data Transfer Objects
- `*.entity.ts` - Database entities

**Modules**:

1. **connection-manager/**
   - Database connection CRUD
   - Connection validation
   - Multi-database support
   - Query execution interface

2. **identity-access/**
   - User registration and login
   - JWT authentication
   - Role and permission management
   - Password hashing

3. **notification-hub/**
   - WebSocket subscriptions
   - Event publishing
   - Real-time notifications
   - Schema change events

4. **schema-inspector/**
   - Database schema introspection
   - Table and column analysis
   - Constraint inspection
   - Schema validation

5. **sql-engine/**
   - SQL query execution
   - Result formatting
   - Query performance analysis
   - Multi-database query support

6. **system-health/**
   - Health checks
   - Service status
   - Error tracking
   - Performance monitoring

7. **tenancy/**
   - Workspace management
   - Team management
   - Multi-tenant isolation
   - Permission scoping

8. **visual-designer/**
   - Diagram persistence
   - Schema visualization
   - Relationship management
   - Layout algorithms

#### `src/common/`
**Purpose**: Shared utilities across modules

- Decorators for common patterns
- Utilities and helpers
- Common types and interfaces
- Shared error handling

#### `prisma/`
**Database Schema**:
- **schema.prisma** - Prisma schema definition
  - All data models
  - Database migrations
  - Relationships and constraints

### Key Patterns

#### Module Structure Example (connection-manager)
```
connection-manager/
├── connection-manager.module.ts          # Module definition
├── connection-manager.service.ts         # Business logic
├── connection-manager.resolver.ts        # GraphQL API
├── dto/
│   ├── create-connection.input.ts
│   └── update-connection.input.ts
├── entities/
│   └── connection.entity.ts
└── connection-manager.module.spec.ts     # Tests
```

#### Service Pattern
Services contain business logic:
```typescript
// Example pattern
@Injectable()
export class ConnectionManagerService {
  constructor(private prisma: PrismaService) {}
  
  async create(dto: CreateConnectionDto) {
    // Validate input
    // Execute business logic
    // Interact with database via Prisma
    // Return result
  }
}
```

#### Resolver Pattern
Resolvers expose GraphQL endpoints:
```typescript
@Resolver('Connection')
export class ConnectionManagerResolver {
  constructor(private service: ConnectionManagerService) {}
  
  @Query()
  async connections() { /* ... */ }
  
  @Mutation()
  async createConnection(args: CreateConnectionInput) { /* ... */ }
  
  @Subscription()
  connectionStatusChanged() { /* ... */ }
}
```

### Configuration Files
- **.env** - Environment variables (PORT, DATABASE_URL, JWT_SECRET)
- **tsconfig.json** - TypeScript config
- **package.json** - Dependencies and scripts
- **schema.gql** - Generated GraphQL schema

---

## Frontend Deep Dive (apps/web)

### Entry Point
- **src/main.tsx** - React app mount point
- **src/App.tsx** - Root component, routing setup
- **vite.config.ts** - Vite build configuration
- **index.html** - HTML template

### Core Directories

#### `src/components/`
**Purpose**: React components organized by feature

```
components/
├── common/              # Shared UI components (used everywhere)
├── diagram/            # Schema diagram visualization
├── editor/             # SQL editor interface
├── notifications/      # Notification system UI
├── schema/             # Schema management
├── ui/                 # Base UI library (Button, Input, etc.)
├── workspace/          # Workspace/team management
├── Navbar.tsx          # Top navigation
├── Sidebar.tsx         # Left navigation
├── SchemaTree.tsx      # Schema tree view
└── TableDataBrowser.tsx # Data browsing interface
```

**UI Component Examples**:
- `ui/button.tsx` - Reusable button
- `ui/dialog.tsx` - Modal dialog
- `ui/table.tsx` - Data table
- `ui/tabs.tsx` - Tab navigation

#### `src/graphql/`
**Purpose**: GraphQL queries, mutations, and subscriptions

Each file corresponds to a backend module:
```
graphql/
├── auth.ts             # Login, register queries
├── connections.ts      # Connection CRUD
├── schema.ts           # Schema introspection
├── tableData.ts        # Data browsing
├── diagrams.ts         # Diagram management
├── notifications.ts    # Subscription setup
├── workspaces.ts       # Workspace operations
└── feature-flags.ts    # Feature flag queries
```

**File Pattern**:
```typescript
// Example: auth.ts
export const LOGIN_QUERY = gql`
  query Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email }
    }
  }
`;
```

#### `src/context/`
**Purpose**: React Context providers

- **FeatureFlagContext.tsx** - Feature flag state
- **ThemeContext.tsx** - Theme (dark/light mode)

#### `src/stores/`
**Purpose**: Zustand state stores for global state

Typically one store per major feature:
- User state
- Connection state
- Schema state
- UI state

#### `src/routes/`
**Purpose**: Page components and routing

Uses React Router for navigation:
- Login page
- Dashboard
- Schema designer
- Data browser
- Settings

#### `src/lib/`
**Purpose**: Utilities and configuration

- **apollo.ts** - Apollo Client setup and configuration
- **utils.ts** - Helper functions and utilities

#### `src/styles/`
**Purpose**: Global styles

- **index.css** - Tailwind imports and global CSS
- Component-specific styles via Tailwind classes

### Key Patterns

#### Component Pattern
```typescript
// Functional component with hooks
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  const [state, setState] = useState<string>('');
  const { data, loading } = useQuery(QUERY);
  
  return <div>{/* JSX */}</div>;
};
```

#### GraphQL Integration Pattern
```typescript
// Using Apollo useQuery hook
const MyComponent = () => {
  const { data, loading, error } = useQuery(CONNECTIONS_QUERY);
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <div>{data?.connections.map(...)}</div>;
};
```

#### State Management Pattern
```typescript
// Zustand store
export const useConnectionStore = create((set) => ({
  selectedConnection: null,
  setSelectedConnection: (conn) => set({ selectedConnection: conn }),
}));

// Using in component
const MyComponent = () => {
  const { selectedConnection, setSelectedConnection } = useConnectionStore();
  // ...
};
```

### Configuration Files
- **vite.config.ts** - Build configuration
- **tsconfig.json** - TypeScript config
- **tailwind.config.ts** - Tailwind CSS customization
- **package.json** - Dependencies and scripts

---

## Shared Packages

### packages/db-drivers

**Purpose**: Multi-database abstraction layer

```
db-drivers/
├── src/
│   ├── index.ts           # Public exports
│   ├── types.ts           # Shared types/interfaces
│   ├── errors.ts          # Custom error classes
│   ├── factory.ts         # Driver factory
│   ├── postgres/          # PostgreSQL driver
│   ├── mysql/             # MySQL driver
│   └── mssql/             # MSSQL driver
└── test/
    └── driver.test.ts
```

**Key Exports**:
```typescript
// Driver factory — resolves an engine string ('POSTGRES' | 'MYSQL' | 'MSSQL') to a driver
export function createDbDriver(engine: string): DbDriver;

// Shared driver interface — schema introspection, DDL, and query execution
export interface DbDriver {
  testConnection(config: ConnectionConfig): Promise<boolean>;
  listSchemas(config: ConnectionConfig): Promise<string[]>;
  listTables(config: ConnectionConfig, schema: string): Promise<TableMeta[]>;
  getColumns(config: ConnectionConfig, schema: string, table: string): Promise<ColumnMeta[]>;
  getForeignKeys(config: ConnectionConfig, schema: string, table: string): Promise<ForeignKeyMeta[]>;
  executeQuery(config: ConnectionConfig, sql: string, options: { timeoutMs: number; maxRows: number }): Promise<QueryResult>;
  getTableData(config: ConnectionConfig, schema: string, table: string, options?: TableDataOptions): Promise<TableDataResult>;
  createTable(config: ConnectionConfig, schema: string, options: CreateTableOptions): Promise<boolean>;
  // ...plus createSchema/dropSchema, addColumn, addForeignKey, dropTable, and
  // grant/revoke schema permissions. See packages/db-drivers/src/types.ts for the full contract.
}
```

Each engine (`postgres/`, `mysql/`, `mssql/`) implements `DbDriver` by keeping a long-lived,
cached connection pool per saved connection (see `pool-cache.ts`) rather than opening a fresh
connection on every call — important context if you're touching driver code.

### packages/shared-types

**Purpose**: Shared TypeScript types and interfaces

```
shared-types/
└── src/
    └── index.ts           # All shared types
```

**Contains**:
- User and auth types
- Connection and database types
- Schema and table types
- API response models
- Common enums

---

## Configuration Files

### pnpm-workspace.yaml
Defines workspace packages:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json
Task orchestration:
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false },
    "test": { "dependsOn": ["^build"] }
  }
}
```

### docker-compose.yml
Local development databases:
- `app-postgres` - Main app database
- `target-postgres` - Target database for testing
- `target-mysql` - Target MySQL database
- `target-mssql` - Target MSSQL database

---

## Testing Files

Located in `apps/api/test/`:
- **feature-flags-verification.ts** - Feature flag tests
- **full-e2e-verification.ts** - End-to-end tests
- **m0-verification.ts through m5-verification.ts** - Milestone tests
- **schema-designer-verification.ts** - Schema design tests
- **workspace-team-crud-verification.ts** - Team management tests
- etc.

---

## Common Development Tasks

### Adding a New Feature

1. **Create API module** in `apps/api/src/modules/new-feature/`
   - `new-feature.module.ts`
   - `new-feature.service.ts`
   - `new-feature.resolver.ts`
   - DTOs and entities

2. **Update Prisma schema** if needed
   - Edit `apps/api/prisma/schema.prisma`
   - Run `pnpm db:migrate`

3. **Create frontend components** in `apps/web/src/components/`
   - Component files
   - Use Zustand for state if needed

4. **Add GraphQL queries** in `apps/web/src/graphql/`
   - Query/mutation definitions
   - Use in components via Apollo Client

5. **Update shared types** if new data structures
   - Edit `packages/shared-types/src/index.ts`

### Finding Code

**Search for a feature**:
```bash
# Find all references to "ConnectionManager"
grep -r "ConnectionManager" apps/

# Find GraphQL resolvers
grep -r "@Query\|@Mutation" apps/api/src/modules/
```

**Trace data flow**:
1. Start with component (apps/web/src/components/)
2. Find GraphQL query (apps/web/src/graphql/)
3. Find resolver (apps/api/src/modules/*/resolver.ts)
4. Find service (apps/api/src/modules/*/service.ts)
5. Find database model (apps/api/prisma/schema.prisma)

---

## File Naming Conventions

- **Modules**: `feature-name.module.ts`
- **Services**: `feature-name.service.ts`
- **Resolvers**: `feature-name.resolver.ts`
- **DTOs**: `create-feature.input.ts`, `update-feature.input.ts`
- **Entities**: `feature.entity.ts`
- **Components**: `FeatureName.tsx` (PascalCase)
- **Hooks**: `useFeatureName.ts`
- **Utils**: `feature-name.utils.ts`
- **Types**: `feature-name.types.ts`

---

## Dependencies Map

```
Frontend (apps/web)
  ├─ @workbench/shared-types
  ├─ @apollo/client
  ├─ react
  ├─ zustand
  └─ tailwindcss

Backend (apps/api)
  ├─ @workbench/db-drivers
  ├─ @workbench/shared-types
  ├─ @nestjs/*
  ├─ @apollo/server
  ├─ prisma
  └─ graphql

DB Drivers (packages/db-drivers)
  ├─ pg (PostgreSQL)
  ├─ mysql2 (MySQL)
  └─ tedious (MSSQL)

Shared Types (packages/shared-types)
  └─ (no internal dependencies)
```

---

## Development Server URLs

When running `pnpm dev`:
- **Frontend**: http://localhost:5173
- **Backend GraphQL**: http://localhost:4000/graphql
- **PostgreSQL App**: localhost:5431
- **PostgreSQL Target**: localhost:5433
- **MySQL Target**: localhost:3307
- **MSSQL Target**: localhost:1434

---

## Common Commands Reference

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all code

# Database
pnpm db:generate           # Generate Prisma client
pnpm db:migrate            # Run migrations
pnpm db:studio             # Open Prisma Studio

# Filtering to specific workspace
pnpm --filter api dev      # Dev mode (API only)
pnpm --filter web build    # Build (web only)

# Turbo specific
turbo graph                # View task dependency graph
turbo run test --parallel  # Run tests in parallel
```

---

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).
For development guidelines, see [DEVELOPMENT.md](./DEVELOPMENT.md).
