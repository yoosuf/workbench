# Architecture Guide

## System Overview

The Universal Database Workbench is built as a modern monorepo with clear separation between backend services, frontend client, and shared packages. This document outlines the architectural decisions, module organization, and data flow.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────┬──────────┬──────────┬─────────────────────┐   │
│  │  Routes  │Components│ GraphQL  │    State (Zustand)  │   │
│  └──────────┴──────────┴──────────┴─────────────────────┘   │
│                            ▲                                  │
│                          HTTP/WS                             │
│                            ▼                                  │
├─────────────────────────────────────────────────────────────┤
│                  Backend (NestJS + GraphQL)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GraphQL Server (Apollo Server)                        │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  API Layer                                            │   │
│  │  ├─ Connection Manager    ├─ Schema Inspector       │   │
│  │  ├─ Identity & Access     ├─ SQL Engine             │   │
│  │  ├─ Notification Hub      ├─ Visual Designer        │   │
│  │  ├─ Tenancy Module        ├─ System Health          │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ▲                                  │
│          ┌─────────────────┼─────────────────┐              │
│          ▼                 ▼                 ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Prisma ORM  │  │ DB Drivers   │  │  Feature     │       │
│  │              │  │  Package     │  │  Flags       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                            ▲                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐         ┌─────────┐
    │PostgreSQL          │MySQL     │        │MSSQL    │
    └─────────┘          └─────────┘         └─────────┘
```

## Module Organization

### Backend Modules (NestJS)

#### 1. **Connection Manager**
Manages database connections and lifecycle.
- Connection pooling and configuration
- Multi-database driver abstraction
- Connection validation and health checks
- Secure credential storage

#### 2. **Identity & Access Management**
Handles user authentication and authorization.
- JWT token generation and validation
- Password hashing and verification
- Role-based access control (RBAC)
- Permission evaluation
- User session management

#### 3. **Notification Hub**
Manages real-time notifications and events.
- WebSocket event broadcasting
- Event queue management
- Subscriber management
- Real-time schema change notifications

#### 4. **Schema Inspector**
Analyzes and validates database schemas.
- Schema introspection and analysis
- Table and column inspection
- Constraint and index analysis
- Schema change detection
- Validation rules

#### 5. **SQL Engine**
Executes SQL queries and returns results.
- Query execution with streaming support
- Result formatting and pagination
- Query performance analysis
- Error handling and recovery
- Transaction support

#### 6. **Tenancy Module**
Multi-tenant support and workspace isolation.
- Workspace creation and management
- Team management within workspaces
- Data isolation per tenant
- Cross-workspace operations

#### 7. **Visual Designer**
Schema diagram and relationship management.
- Diagram persistence
- Relationship visualization
- Schema modification via diagrams
- Export/import functionality

#### 8. **System Health**
Application health and monitoring.
- Service status checks
- Performance metrics
- Error logging and tracking
- Diagnostics and debugging

#### 9. **Core Services**
Shared core functionality.
- Database module initialization
- Security utilities
- Common decorators and guards
- Logging and error handling

### Frontend Architecture

#### Component Structure
```
src/
├── components/
│   ├── common/           # Shared UI components
│   ├── diagram/          # Schema diagram visualization
│   ├── editor/           # SQL editor and IDE
│   ├── notifications/    # Notification system UI
│   ├── schema/           # Schema management components
│   ├── ui/               # Base UI library (buttons, inputs, etc.)
│   └── workspace/        # Workspace/team management
├── context/
│   ├── FeatureFlagContext.tsx    # Feature flag provider
│   └── ThemeContext.tsx          # Theme management
├── graphql/
│   ├── auth.ts          # Authentication queries
│   ├── connections.ts   # Connection management queries
│   ├── schema.ts        # Schema queries
│   ├── tableData.ts     # Data browsing queries
│   └── ...other modules
├── stores/              # Zustand state stores
├── routes/              # Page routing
└── lib/
    └── apollo.ts        # Apollo Client configuration
```

#### State Management
- **Local Component State**: React hooks for component-specific state
- **Global State**: Zustand stores for app-wide state
- **Server State**: Apollo Client for GraphQL cache and sync

#### Data Flow
```
User Action
    ▼
Component Handler
    ▼
Zustand Store Update / GraphQL Query
    ▼
Apollo Client
    ▼
GraphQL Subscription / Query / Mutation
    ▼
Backend API
    ▼
Prisma ORM / DB Driver
    ▼
Database
```

## Database Design

### Prisma Schema
- Centralized in `apps/api/prisma/schema.prisma`
- Supports multiple database providers
- Auto-migration support
- Type-safe database access

### Multi-Database Support

The `@workbench/db-drivers` package provides abstraction over:

1. **PostgreSQL Driver** (`postgres/postgres.driver.ts`)
   - Uses `pg` library
   - Connection pooling
   - Full feature support

2. **MySQL Driver** (`mysql/mysql.driver.ts`)
   - Uses `mysql2` library
   - Connection management
   - Query compatibility layer

3. **MSSQL Driver** (`mssql/mssql.driver.ts`)
   - Uses `tedious` library
   - Connection pooling
   - T-SQL support

Each driver implements a common interface for:
- Connection management
- Query execution
- Result transformation
- Error handling

## GraphQL Schema

The schema is generated from the NestJS resolvers (code-first), not hand-written. The
operations below reflect the actual resolvers as of this writing — check
`apps/api/src/modules/*/*.resolver.ts` directly, since this list will drift as the API grows.

### Authentication (`identity-access`)
```graphql
type Mutation {
  signup(input: SignupInput!): AuthResponse!
  login(input: LoginInput!): AuthResponse!
  refreshToken: AuthResponse!
  logout: Boolean!
}
type Query {
  me: User!
}
```

### Connections (`connection-manager`)
```graphql
type Query {
  listConnections(workspaceId: ID): [Connection!]!
  connection(id: ID!): Connection!
}
type Mutation {
  testConnection(input: TestConnectionInput!): TestConnectionResult!
  testSavedConnection(id: ID!): TestConnectionResult!
  createConnection(input: CreateConnectionInput!): Connection!
  deleteConnection(id: ID!): Boolean!
}
```

### Schema Inspection (`schema-inspector`)
```graphql
type Query {
  connectionSchemas(connectionId: ID!): [SchemaInfo!]!
  listDatabaseUsers(connectionId: ID!): [DatabaseUser!]!
  getSchemaPermissions(connectionId: ID!, schema: String!): [SchemaPermission!]!
  schemaTables(connectionId: ID!, schema: String!): [TableInfo!]!
  tableDetail(connectionId: ID!, schema: String!, table: String!): TableInfo!
  browseTableData(connectionId: ID!, schema: String!, table: String!, ...): TableDataResult!
}
type Mutation {
  createSchema(connectionId: ID!, name: String!): SchemaInfo!
  dropSchema(connectionId: ID!, name: String!, cascade: Boolean): Boolean!
  grantSchemaPermission(...): Boolean!
  revokeSchemaPermission(...): Boolean!
}
```

## Security Architecture

### Authentication Flow
```
User Login
    ▼
Password Verification (bcryptjs)
    ▼
JWT Token Generation
    ▼
Token Stored (HttpOnly Cookie)
    ▼
Subsequent Requests Include Token
    ▼
Passport JWT Guard Verification
    ▼
Request Authorized/Rejected
```

### Authorization
- GraphQL directives for permission checks
- Resolver-level guards
- Field-level resolver authorization
- Workspace-scoped data access

## Dependency Management

### Monorepo Structure (Turbo + pnpm)
- `pnpm-workspace.yaml`: Workspace configuration
- `turbo.json`: Task orchestration
- Internal dependencies via `workspace:*`

### Package Dependencies
```
apps/api
  ├─ depends on → @workbench/db-drivers
  └─ depends on → @workbench/shared-types

apps/web
  └─ depends on → @workbench/shared-types

packages/db-drivers
  └─ depends on → nothing

packages/shared-types
  └─ depends on → nothing
```

## Data Persistence

### Application Database (Prisma)
- Stores users, workspaces, connections, permissions
- Multi-tenant data isolation
- Transaction support
- Migration tracking

### Target Databases
- User-provided database connections
- Read-only in current phase
- Schema introspection
- Data browsing and querying

## Real-Time Communication

### WebSocket Layer
- Apollo Server subscriptions
- Connection upgrade from HTTP
- Event-based messaging

### Notification Events
```typescript
// Subscription example
subscription OnSchemaChange($connectionId: ID!) {
  schemaChanged(connectionId: $connectionId) {
    type
    timestamp
    changes {
      type
      tableName
      details
    }
  }
}
```

## Error Handling

### Backend
- Custom exception filters
- GraphQL error formatting
- Structured error responses
- Logging and tracking

### Frontend
- Apollo Link error handling
- User-friendly error messages
- Error recovery strategies
- Retry logic for transient failures

## Performance Considerations

### Backend
- DataLoader for batch query optimization
- Query result caching (Redis-ready)
- Connection pooling
- Database query optimization

### Frontend
- Code splitting via Vite
- Component lazy loading
- GraphQL query optimization
- Apollo Client caching

## Scaling Strategy

### Horizontal Scaling
- Stateless API servers (behind load balancer)
- Shared session store (Redis)
- Connection pooling across instances

### Database Scaling
- Read replicas for reporting
- Connection pooling coordination
- Query performance monitoring

## Development Workflow

### Local Development
```bash
# Start all services
pnpm dev

# Runs:
# - Backend: pnpm --filter api dev (watches for changes)
# - Frontend: pnpm --filter web dev (HMR enabled)
# - Docker containers for databases
```

### Building for Production
```bash
# Build all
pnpm build

# Outputs:
# - apps/api/dist/
# - apps/web/dist/
```

## Testing Strategy

### Unit Tests
- Jest for backend
- Vitest for frontend
- Module-level testing

### Integration Tests
- End-to-end database operations
- Multi-module workflows
- API contract testing

### E2E Tests
- Full user workflows
- UI interaction testing
- Cross-module scenarios

---

For more details on specific modules or layers, see the [Development Guide](./DEVELOPMENT.md).
