# MCP Server for Universal Database Workbench

Model Context Protocol (MCP) server that enables AI agents to interact with the Workbench platform for intelligent database management.

> **Status: implemented and tested.** All 24 tools listed below call real operations on the
> Workbench GraphQL API (`apps/api`) and were verified end-to-end via the actual compiled
> stdio server. Six tools (`drop_column`, `create_index`, `insert_data`, `update_data`,
> `delete_data`, `execute_query_with_params`) build raw SQL client-side because the API has no
> dedicated mutation for them — see `src/sql-utils.ts`. Agent audit logging/tracking
> (mentioned later in this doc as a roadmap item) is **not implemented** — there is no
> `Agent`/`AgentAction` table or resolver.

## Overview

This MCP server provides a standardized interface for AI agents (Claude, other LLMs) to:

- **Discover and manage database connections**
- **Inspect database schemas and structures**
- **Execute SQL queries and modifications**
- **Manage workspaces and permissions**
- **Analyze query performance**
- **Create and modify tables, indexes, and relationships**

## Installation

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Usage

### Start the MCP Server

```bash
pnpm start
```

The server will start listening on stdio and be ready to accept requests from MCP clients (AI agents).

### With Claude (via .claude/claude.json)

Add to your `claude.json` configuration:

```json
{
  "mcpServers": {
    "workbench": {
      "command": "node",
      "args": ["packages/mcp-server/dist/mcp-server.js"],
      "env": {
        "WORKBENCH_API_URL": "http://localhost:4000/graphql",
        "WORKBENCH_AUTH_TOKEN": "your-jwt-token"
      }
    }
  }
}
```

### With Other AI Frameworks

The MCP server is compatible with any framework that supports MCP v1.0+:

```python
# Python example with Claude API
from anthropic import Anthropic
import subprocess
import json

client = Anthropic()

# Start MCP server
mcp_process = subprocess.Popen(
    ["node", "packages/mcp-server/dist/mcp-server.js"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Use Claude with MCP tools
# (Claude SDK will handle tool discovery and execution)
```

## Available Tools

### Connection Management

- **list_connections** - List all database connections in a workspace
- **get_connection_details** - Get details about a specific connection
- **test_connection** - Test if a connection is active and accessible
- **create_connection** - Create a new database connection

### Schema Management

- **get_schema** - Get complete database schema (all tables and columns)
- **get_table_structure** - Get detailed structure of a specific table
- **get_table_indexes** - Get all indexes for a table
- **get_table_relationships** - Get foreign key relationships
- **create_table** - Create a new table
- **add_column** - Add a column to a table
- **drop_column** - Remove a column from a table
- **create_index** - Create an index on columns

### Query Execution

- **execute_query** - Execute a SQL query and return results
- **execute_query_with_params** - Execute parameterized query (SQL injection safe)
- **insert_data** - Insert data into a table
- **update_data** - Update records in a table
- **delete_data** - Delete records from a table

### Workspace Management

- **get_current_workspace** - Get current workspace info
- **list_workspaces** - List all accessible workspaces
- **switch_workspace** - Switch to a different workspace

### Data Inspection & Analysis

- **get_table_row_count** - Get number of rows in a table
- **get_table_stats** - Get table statistics (rows, size, cardinality)
- **analyze_query_performance** - Analyze query with EXPLAIN PLAN
- **get_slow_queries** - Get list of slow queries from logs

## Example: Using with Claude

### Schema Discovery

```
User: "What tables do we have in our production database?"

Claude (using MCP):
1. Calls get_schema(connection_id="prod_postgres")
2. Receives schema information
3. Returns summarized overview to user
```

### Schema Modification

```
User: "Add an 'email_verified' boolean column to the users table"

Claude (using MCP):
1. Calls get_table_structure(connection_id="prod", table_name="users")
2. Calls add_column(connection_id="prod", table_name="users", 
                    column_name="email_verified", column_type="BOOLEAN",
                    nullable=false, default="FALSE")
3. Returns success confirmation
```

### Query Execution & Analysis

```
User: "Why is this query slow? SELECT * FROM users WHERE email LIKE '%@domain.com%'"

Claude (using MCP):
1. Calls analyze_query_performance(connection_id="prod", query="SELECT ...")
2. Receives EXPLAIN PLAN output
3. Analyzes results and suggests optimization (create index on email column)
4. Calls create_index(connection_id="prod", table_name="users",
                      index_name="idx_users_email", columns="email")
5. Returns optimization complete
```

### Multi-Database Coordination

```
User: "Migrate this table from MySQL to PostgreSQL"

Claude (using MCP):
1. get_schema(connection_id="mysql_legacy", table_name="orders")
2. Create equivalent table in PostgreSQL
3. execute_query_with_params() to copy data
4. Verify integrity and report complete
```

## Architecture

### Request Flow

```
AI Agent (Claude, etc.)
    ↓
MCP Protocol (JSON-RPC over stdio)
    ↓
Workbench MCP Server
    ↓
GraphQL API (http://localhost:4000/graphql)
    ↓
NestJS Backend
    ↓
Database Drivers (PostgreSQL, MySQL, MSSQL)
    ↓
Target Databases
```

### Security Considerations

1. **Authentication**: MCP server uses JWT tokens for API authentication
2. **Authorization**: Inherits workspace permissions from Workbench
3. **Input Validation**: All parameters validated before execution
4. **SQL Safety**: Parameterized queries prevent SQL injection
5. **Audit Logging**: All agent actions logged in Workbench audit trail

## Environment Variables

```bash
# Workbench API Configuration
WORKBENCH_API_URL=http://localhost:4000/graphql
WORKBENCH_AUTH_TOKEN=your-jwt-token

# Optional: Workspace ID (defaults to current)
WORKBENCH_WORKSPACE_ID=workspace-uuid

# Optional: Request timeout (ms)
WORKBENCH_REQUEST_TIMEOUT=30000
```

## Implementation Status

### Completed ✅
- [x] MCP server framework
- [x] Tool definitions for all categories
- [x] TypeScript types and interfaces
- [x] Package configuration
- [x] GraphQL client integration (`graphql-request`, JWT bearer auth)
- [x] All 24 tool handler implementations, mapped to the real GraphQL schema
- [x] Error handling (GraphQL + network errors formatted consistently as `{success: false, error}`)
- [x] End-to-end verified against a live API + Postgres target (manual stdio JSON-RPC test)

### Not implemented 🔄
- [ ] Automated integration tests (the verification above was a manual one-off script)
- [ ] Agent audit logging / tracking (`Agent`/`AgentAction` tables — see docs/SCHEMA_EXTENSIONS_MCP.md
      for a *draft* schema; it has a real bug — `@@fulltext` isn't valid for a `postgresql`
      Prisma datasource — and hasn't been reconciled with this project's naming conventions,
      so don't copy it in as-is)
- [ ] Rate limiting

### Planned 🗓️
- [ ] Streaming results for large queries
- [ ] Real-time query progress updates
- [ ] Advanced query optimization suggestions
- [ ] Batch operations for performance
- [ ] Webhook support for long-running operations

## Development

### Run in Development Mode

```bash
pnpm dev
```

### Build TypeScript

```bash
pnpm build
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
```

## Integration with Main API

The MCP server is a plain GraphQL client (see `src/graphql-client.ts`) — it needs **no changes**
to `apps/api` to work; `pnpm-workspace.yaml` already covers `packages/*` and picks it up
automatically. Everything below this point is a **roadmap sketch for future agent-tracking
work**, not something this server currently requires or that exists in `apps/api` today.

### Possible future: dedicated agent-tracking support in apps/api

1. **Add MCP resolver** in `apps/api/src/modules/` for agent-tracking features
2. **Extend GraphQL schema** with agent tracking
3. **Add audit logging** for agent actions
4. **Implement rate limiting** for agent requests

### Sketch of a GraphQL extension (not implemented)

```typescript
// apps/api/src/core/graphql/mcp.schema.ts
type Agent {
  id: ID!
  name: String!
  createdAt: DateTime!
}

type AgentAction {
  id: ID!
  agent: Agent!
  action: String!
  parameters: JSON!
  result: JSON!
  createdAt: DateTime!
}

extend type Query {
  agentActions(agentId: ID!): [AgentAction!]!
  currentAgent: Agent
}
```

## Troubleshooting

### MCP Server Not Starting

```bash
# Check if port is in use
lsof -i :4000

# Verify Workbench API is running
curl http://localhost:4000/graphql

# Check environment variables
echo $WORKBENCH_API_URL
```

### Authentication Errors

```bash
# Verify JWT token is valid
# Generate new token via Workbench UI or API
# Update WORKBENCH_AUTH_TOKEN environment variable
```

### Tool Execution Failures

```bash
# Enable debug logging
DEBUG=workbench:* pnpm start

# Check MCP server logs
# Check Workbench API logs
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

Areas for contribution:
- [ ] Complete tool handler implementations
- [ ] Add new MCP tools for advanced features
- [ ] Write integration tests
- [ ] Improve error handling
- [ ] Add performance optimizations
- [ ] Documentation improvements

## References

- [Model Context Protocol (MCP) Spec](https://modelcontextprotocol.io/)
- [Claude Agent Documentation](https://docs.anthropic.com/)
- [Workbench Architecture](../../ARCHITECTURE.md)
- [GraphQL API Documentation](../../docs/graphql-api.md)

## License

Same as main Workbench project
