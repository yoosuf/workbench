# Universal Database Workbench

A **modern, cloud-ready database management and visual design platform** built with NestJS, GraphQL, React, and Vite. Workbench provides a comprehensive solution for managing multiple database types with intuitive schema visualization, data exploration, and **real-time team collaboration** features.

**The Next-Generation Alternative to MySQL Workbench, DBeaver, and Adminer** — Built for modern development teams and deployment pipelines.

## 🚀 Features

- **Multi-Database Support**: Seamless integration with PostgreSQL, MySQL, and MSSQL
- **Visual Schema Designer**: Interactive diagram-based schema creation and modification
- **Data Browser**: Powerful table data exploration and manipulation
- **Real-time Notifications**: WebSocket-based event system for collaborative updates
- **Multi-Workspace Support**: Organize projects into isolated workspaces with team management
- **Identity & Access Management**: Role-based access control and team permissions
- **Feature Flags**: Dynamic feature toggle system for controlled rollouts
- **Connection Management**: Secure database connection handling with encryption
- **Schema Inspector**: Detailed schema analysis and validation tools
- **SQL Engine**: Advanced query execution and result streaming

## 🏆 Why Workbench? (vs. MySQL Workbench, DBeaver, Adminer)

### At a Glance

```
MySQL Workbench    → Desktop application for MySQL only
DBeaver            → Heavy Java-based tool, not web-first
Adminer            → Lightweight but lacks team features
Workbench (Ours)   → 🎯 Modern, collaborative, multi-database, open-source
```

### The Real Difference

| Feature | Workbench | MySQL Workbench | DBeaver | Adminer |
|---------|-----------|-----------------|---------|---------|
| **Multi-Database Support** | ✅ PG, MySQL, MSSQL | ⚠️ MySQL only | ✅ 30+ databases | ✅ Multiple |
| **Real-time Collaboration** | ✅ Team workspaces | ❌ Single user | ❌ No | ❌ No |
| **Visual Schema Designer** | ✅ Interactive diagrams | ✅ Basic ER diagrams | ✅ Basic | ❌ No |
| **Cloud/Web-Based** | ✅ Full SaaS ready | ❌ Desktop only | ⚠️ Limited | ✅ Web-based |
| **Team Management** | ✅ Built-in RBAC | ❌ No | ❌ No | ⚠️ Basic |
| **API-First Architecture** | ✅ GraphQL API | ❌ No | ❌ No | ❌ No |
| **Open Source** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Modern Tech Stack** | ✅ React, Node.js | ❌ Legacy C++ | ⚠️ Java | ⚠️ PHP |
| **Real-time Updates** | ✅ WebSocket support | ❌ No | ❌ No | ❌ No |
| **Feature Flags** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **TypeScript/Type Safety** | ✅ End-to-end | ❌ No | ❌ No | ❌ No |
| **Extensible API** | ✅ GraphQL | ❌ No | ⚠️ Limited | ❌ REST only |
| **Self-Hostable** | ✅ Docker included | ⚠️ Limited | ✅ Yes | ✅ Yes |
| **Active Development** | ✅ Actively maintained | ⚠️ Slower updates | ✅ Very active | ⚠️ Slower |

### Key Advantages

#### 🌐 True Cloud-Native Architecture
Unlike MySQL Workbench's desktop-only approach, Workbench is built as a **web application** that works anywhere:
- No installation required — just open in browser
- Instant updates without user intervention
- Works on Windows, Mac, Linux, iOS, Android
- Perfect for remote teams and distributed development

#### 👥 Built-in Team Collaboration
**MySQL Workbench:** Single-user desktop application  
**Workbench:** Native workspace and team support
- Share connections and schemas with team members
- Role-based access control (RBAC)
- Activity tracking and notifications
- Real-time schema change notifications
- Invite teammates with permission levels

#### 📱 Multi-Database Management
**MySQL Workbench:** MySQL only  
**Workbench:** PostgreSQL, MySQL, and MSSQL
- Switch between databases without leaving application
- Same interface for all databases
- Unified schema designer across databases
- Query translation and optimization

#### ⚡ Modern, Fast Architecture
- Built with **React + Vite** (not legacy desktop frameworks)
- **GraphQL API** for efficient data fetching
- **Real-time updates** via WebSockets
- **Type-safe** end-to-end (TypeScript everywhere)
- Lightning-fast UI with hot-reload development

#### 🔌 Extensible via GraphQL API
- Full REST-like API access via GraphQL
- Build custom tools and integrations
- Programmatic schema management
- Ideal for CI/CD pipelines and automation

#### 🚀 SaaS/Self-Hosted Flexibility
- Self-host with Docker (included `docker-compose.yml`)
- Deploy to any cloud (AWS, Azure, GCP, Heroku, etc.)
- Zero vendor lock-in
- Full source code transparency

#### 🔐 Enterprise Security
- JWT-based authentication
- Row-level security with workspace isolation
- Encrypted credential storage
- CORS and input validation
- Self-hosting for compliance requirements

### Perfect For...

✅ **Development Teams** — Collaborate on database schema design  
✅ **Remote/Distributed Teams** — Access from anywhere  
✅ **Multi-Database Environments** — Single tool for multiple databases  
✅ **DevOps/Automation** — API-first design for CI/CD integration  
✅ **Startups** — Open source, self-hostable, scalable  
✅ **Enterprises** — Full control with self-hosting option  
✅ **Cloud-Native Applications** — Built for modern deployments  

---

## 📁 Project Structure

```
workbench/
├── apps/
│   ├── api/                    # NestJS GraphQL Backend
│   │   ├── src/
│   │   │   ├── modules/       # Feature modules
│   │   │   ├── core/          # Core services
│   │   │   ├── common/        # Shared utilities
│   │   │   └── main.ts        # Entry point
│   │   └── prisma/            # Database schema
│   └── web/                    # React Frontend
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── context/       # Context providers
│       │   ├── graphql/       # GraphQL queries
│       │   ├── stores/        # State management
│       │   └── routes/        # Page routes
│       └── vite.config.ts     # Vite configuration
├── packages/
│   ├── db-drivers/            # Multi-database driver package
│   │   └── src/
│   │       ├── postgres/      # PostgreSQL implementation
│   │       ├── mysql/         # MySQL implementation
│   │       └── mssql/         # MSSQL implementation
│   └── shared-types/          # Shared TypeScript types
└── docker/                     # Docker configurations
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS 11
- **API**: GraphQL with Apollo Server
- **Database ORM**: Prisma 6
- **Authentication**: JWT with Passport
- **Security**: bcryptjs for password hashing
- **Real-time**: WebSocket support via Apollo Server

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **GraphQL Client**: Apollo Client
- **Editor**: Monaco Editor
- **UI Components**: Radix UI, custom shadcn-inspired components
- **Data Tables**: TanStack React Table
- **Diagrams**: Dagre for graph layouts

### Infrastructure
- **Monorepo Tool**: Turbo
- **Package Manager**: pnpm
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm 10+
- Docker & Docker Compose
- PostgreSQL, MySQL, or MSSQL for target databases

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workbench
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   # Create .env files in apps/api
   cp apps/api/.env.example apps/api/.env
   ```

4. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

5. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

6. **Start development servers**
   ```bash
   pnpm dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- API: http://localhost:4000/graphql

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - System design and module overview
- [Development Guide](./DEVELOPMENT.md) - Development workflows and commands
- [Project Discovery](./PROJECT_DISCOVERY.md) - Codebase navigation and structure
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute
- [Setup Instructions](./SETUP.md) - Detailed setup and configuration

## 🔧 Available Commands

### Development
```bash
# Start all services in development mode
pnpm dev

# Watch and rebuild
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Database
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

### Workspace Operations
```bash
# Filter commands to specific workspace
pnpm --filter api build
pnpm --filter web dev

# View task graph
turbo graph
```

## 📦 Core Packages

### @workbench/db-drivers
Multi-database abstraction layer supporting:
- PostgreSQL via `pg`
- MySQL via `mysql2`
- MSSQL via `tedious`

**Features:**
- Connection pooling
- Query execution
- Error handling
- Type safety

### @workbench/shared-types
Shared TypeScript types and interfaces used across frontend and backend:
- GraphQL schema types
- API response models
- Domain entities
- Utility types

## 🏗️ Architecture Highlights

- **Modular Design**: Feature-based module organization in the API
- **GraphQL-First**: Type-safe API layer with full schema introspection
- **Separation of Concerns**: Clear boundaries between data, business logic, and presentation
- **Real-time Updates**: WebSocket support for live notifications
- **Scalable Database**: Prisma enables easy database migration and evolution

## 🔐 Security

- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured CORS for frontend domain
- **Input Validation**: DTO-based request validation with class-validator
- **Password Hashing**: bcryptjs for secure password storage
- **Connection Security**: Encrypted database credentials

## 🚀 Deployment

### Production Build
```bash
# Build all packages
pnpm build

# API production start
node apps/api/dist/main

# Web production preview
pnpm --filter web preview
```

### Docker Deployment
```bash
docker-compose up --build
```

## 💡 Use Cases

### Scenario 1: Distributed Development Team
A startup with developers across 3 continents needs to collaborate on database schema design.

**Without Workbench:** 
- Use MySQL Workbench (desktop only) — not web-accessible
- Email schema files back and forth
- Merge conflicts and version control nightmares
- No real-time collaboration

**With Workbench:**
- ✅ Team members access same workspace from browser
- ✅ Real-time notifications of schema changes
- ✅ Role-based permissions (Junior Dev can view, Senior Lead can approve)
- ✅ Complete audit trail of who changed what

### Scenario 2: Multi-Database Migration
Enterprise needs to migrate from MySQL to PostgreSQL while maintaining MySQL for legacy systems.

**Without Workbench:**
- Use different tools for MySQL and PostgreSQL
- Learn different interfaces and workflows
- Manual query translation between databases
- No unified schema visualization

**With Workbench:**
- ✅ Single interface for both MySQL and PostgreSQL
- ✅ Side-by-side schema comparison
- ✅ Query execution on both databases simultaneously
- ✅ Automatic schema synchronization

### Scenario 3: CI/CD Pipeline Integration
DevOps team wants to automate database schema deployments.

**Without Workbench:**
- Limited API access, must use CLI tools
- Manual migration scripts
- No version control integration
- Complex bash scripting

**With Workbench:**
- ✅ Full GraphQL API for automation
- ✅ Feature flags for gradual rollouts
- ✅ Programmatic schema management
- ✅ Perfect for Infrastructure-as-Code

### Scenario 4: Client Database Management
SaaS company manages customer databases and needs secure, multi-tenant access.

**Without Workbench:**
- Give direct database access (security risk!)
- Each customer needs their own tools
- Complex permission management
- No audit trail

**With Workbench:**
- ✅ Workspace isolation per customer
- ✅ Role-based access control
- ✅ Complete audit logging
- ✅ Safe, permission-gated access

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Code standards
- Commit conventions
- Pull request process
- Development workflow

## 📝 License

[Add your license here]

## 📧 Support & Community

- 📖 **Full Documentation:** See [Project Discovery](./PROJECT_DISCOVERY.md)
- 🏗️ **Architecture Guide:** Check [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🚀 **Getting Started:** Follow [SETUP.md](./SETUP.md)
- 💬 **Issues & Discussions:** Open GitHub Issues
- 🤝 **Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🌟 Key Highlights

| Aspect | Benefit |
|--------|---------|
| **Cost** | Open source, self-hostable (no subscription fees) |
| **Speed** | Modern tech stack ensures lightning-fast performance |
| **Team Ready** | Built-in collaboration, no additional tools needed |
| **Multi-Database** | Manage PostgreSQL, MySQL, MSSQL from one place |
| **Secure** | Full control with self-hosting option |
| **Extensible** | GraphQL API for custom integrations |
| **Modern** | Active development, continuous improvements |

---

**Universal Database Workbench** — The open-source, web-based alternative to MySQL Workbench for modern development teams.

**Made by CrewDigital** | Universal Database Workbench v0.1.0
