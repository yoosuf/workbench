# Setup Instructions

Complete guide to set up the Universal Database Workbench for development.

## System Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | [Download](https://nodejs.org/) |
| npm | 8+ | Comes with Node.js |
| pnpm | 10+ | `npm install -g pnpm` |
| Docker | Latest | [Download](https://www.docker.com/) |
| Docker Compose | 2+ | Usually bundled with Docker Desktop |
| Git | Latest | [Download](https://git-scm.com/) |
| PostgreSQL Client | Optional | For direct DB access |

## Step 1: Verify Prerequisites

```bash
# Check Node.js
node --version  # Should be v18 or higher

# Check npm
npm --version   # Should be 8 or higher

# Check pnpm (install if not present)
pnpm --version  # Should be 10 or higher
# If not installed:
npm install -g pnpm

# Check Docker
docker --version

# Check Docker Compose
docker-compose --version
```

## Step 2: Clone Repository

```bash
# Using HTTPS
git clone https://github.com/crewdigital/workbench.git
cd workbench

# OR using SSH
git clone git@github.com:crewdigital/workbench.git
cd workbench
```

## Step 3: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This installs dependencies for:
# - Root workspace
# - apps/api
# - apps/web
# - packages/db-drivers
# - packages/shared-types
```

If you encounter issues:
```bash
# Clear pnpm cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install --force
```

## Step 4: Environment Configuration

### Backend Environment Variables

Create `.env` file in `apps/api/`:

```bash
cat > apps/api/.env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5431/workbench_app"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-12345"
JWT_EXPIRATION="24h"

# Server Configuration
NODE_ENV="development"
PORT=4000

# CORS Configuration (for frontend)
CORS_ORIGIN="http://localhost:5173"

# Optional: Logging level
LOG_LEVEL="debug"

# Optional: Feature flags
FEATURE_SCHEMA_DESIGNER_ENABLED=true
FEATURE_NOTIFICATIONS_ENABLED=true
EOF
```

**Important Notes:**
- Change `JWT_SECRET` to a unique value
- Update `DATABASE_URL` if using different database
- Keep `.env` in `.gitignore` (should already be configured)

### Frontend Environment (Optional)

Create `.env.local` file in `apps/web/` (optional):

```bash
cat > apps/web/.env.local << 'EOF'
# Frontend Configuration
VITE_API_URL=http://localhost:4000/graphql
VITE_WS_URL=ws://localhost:4000/graphql

# Optional: Feature flags
VITE_FEATURE_SCHEMA_DESIGNER=true
EOF
```

## Step 5: Start Docker Services

```bash
# Start all database containers
docker-compose up -d

# Verify containers are running
docker-compose ps
```

Output should show:
```
CONTAINER ID   IMAGE                 STATUS
xxx            postgres:16-alpine    Up X seconds
xxx            mysql:8               Up X seconds
xxx            mcr.microsoft...      Up X seconds
```

### Troubleshooting Docker

**Port Already in Use:**
```bash
# Find process using port
lsof -i :5431  # PostgreSQL
lsof -i :3307  # MySQL
lsof -i :1434  # MSSQL

# Kill process (requires sudo)
sudo kill -9 <PID>
```

**Container Won't Start:**
```bash
# View logs
docker-compose logs

# Remove and restart
docker-compose down -v
docker-compose up -d
```

## Step 6: Initialize Database

### Generate Prisma Client

```bash
pnpm db:generate
```

This generates the Prisma client based on your schema.

### Run Migrations

```bash
pnpm db:migrate
```

Follow prompts to:
1. Name the migration (or accept default)
2. Confirm database schema changes
3. Wait for migration to complete

**What this does:**
- Creates/updates database schema
- Applies all pending migrations
- Generates Prisma client

### Verify Database

```bash
# Open Prisma Studio (visual database browser)
pnpm db:studio

# This opens http://localhost:5555
# You can browse and edit data visually
```

## Step 7: Build Packages

```bash
# Build all packages
pnpm build

# This compiles:
# - TypeScript to JavaScript
# - Backend modules
# - Frontend assets
```

Expected output: No errors, build succeeds for all packages.

## Step 8: Start Development Servers

```bash
# Start all services in parallel
pnpm dev

# This starts:
# - Backend API on port 4000
# - Frontend on port 5173
# - Both in watch/hot-reload mode
```

Wait for output similar to:
```
✔ Building...
✔ Compiled successfully
api: [Nest] 1 - 01/15/2025, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
api: [Nest] 1 - 01/15/2025, 10:00:00 AM     LOG Universal DB Workbench API running on http://localhost:4000/graphql
web: Local:   http://localhost:5173/
```

## Step 9: Verify Installation

### Check Backend
```bash
# Visit GraphQL Playground
curl http://localhost:4000/graphql

# Should return HTML with GraphQL Playground interface
```

### Check Frontend
```bash
# Open in browser
# http://localhost:5173

# You should see login page
```

### Run Tests
```bash
# Run all tests
pnpm test

# Should see test results for all packages
```

## Step 10: Create First User (Optional)

To test the application, you might want to create a test user. This depends on your implementation - check the authentication module for user creation methods.

## Development Server URLs

Once everything is running:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React application |
| GraphQL API | http://localhost:4000/graphql | GraphQL endpoint & playground |
| Prisma Studio | http://localhost:5555 | Visual database manager |
| App PostgreSQL | localhost:5431 | Main application database |
| Target PostgreSQL | localhost:5433 | Sample target database |
| MySQL Target | localhost:3307 | Sample MySQL database |
| MSSQL Target | localhost:1434 | Sample MSSQL database |

## Common Setup Issues & Solutions

### Issue: `pnpm install` fails

**Solution:**
```bash
# Clear cache and reinstall
pnpm store prune
pnpm install --force

# Or clean slate
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue: Port 5431/4000/5173 already in use

**Solution:**
```bash
# Find and kill the process
lsof -i :5431
sudo kill -9 <PID>

# Or use different port
PORT=5000 pnpm --filter api dev
```

### Issue: Database connection refused

**Solution:**
```bash
# Check Docker containers
docker-compose ps

# Check container logs
docker-compose logs postgres

# Restart containers
docker-compose restart

# Reset database (removes data!)
docker-compose down -v
docker-compose up -d
```

### Issue: Prisma migration fails

**Solution:**
```bash
# Reset database (removes all data!)
pnpm db:reset

# Or manually fix:
rm -rf apps/api/prisma/migrations
pnpm db:migrate
```

### Issue: Node modules corrupt

**Solution:**
```bash
# Nuclear option
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Regenerate dependencies
pnpm db:generate
```

## Development Workflow Commands

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint code
pnpm format           # Format with Prettier

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open database UI
pnpm db:reset         # DANGEROUS: Reset database

# Individual packages
pnpm --filter api dev
pnpm --filter web build
pnpm --filter db-drivers test

# Git workflow
git checkout -b feature/my-feature
# Make changes
pnpm test
pnpm lint --fix
git commit -m "feat: my feature"
git push -u origin feature/my-feature
# Create pull request
```

## IDE Setup (Recommended)

### VS Code Extensions
```bash
# Install recommended extensions
# REST Client - for GraphQL testing
# Prisma - for schema.prisma syntax highlighting
# ESLint - for code linting
# Prettier - for code formatting
# Thunder Client - for API testing
```

### VS Code Settings (.vscode/settings.json)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "search.exclude": {
    "node_modules": true,
    ".turbo": true,
    "dist": true
  }
}
```

## Next Steps

1. **Read documentation:**
   - [README.md](./README.md) - Project overview
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
   - [PROJECT_DISCOVERY.md](./PROJECT_DISCOVERY.md) - Codebase navigation

2. **Make a test change:**
   - Modify a component
   - Watch it hot-reload
   - Run tests to verify

3. **Explore the codebase:**
   - Check out [PROJECT_DISCOVERY.md](./PROJECT_DISCOVERY.md)
   - Review module structure
   - Understand data flow

4. **Get started contributing:**
   - Read [CONTRIBUTING.md](./CONTRIBUTING.md)
   - Create a feature branch
   - Make your first contribution!

## Getting Help

- **Setup issues:** See "Common Setup Issues" section above
- **Development questions:** See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Code navigation:** See [PROJECT_DISCOVERY.md](./PROJECT_DISCOVERY.md)
- **Architecture questions:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **GitHub Issues:** Search existing issues or create new one

---

**You're all set!** 🚀

Your development environment is ready. Start with `pnpm dev` and visit http://localhost:5173.
