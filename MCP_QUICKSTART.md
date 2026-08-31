# MCP Quick Start Guide

Get Claude and other AI agents connected to your Workbench instance in minutes.

> **Reality check:** the 24 tools in `packages/mcp-server/src/mcp-server.ts` are real,
> implemented, and verified end-to-end against the live GraphQL API — the "Start the MCP
> Server" and "Configure Claude Desktop" steps below work as written. A few things further down
> this doc are illustrative rather than implemented: `WORKBENCH_QUERY_LIMIT` /
> `WORKBENCH_TIMEOUT_MS` / `WORKBENCH_MAX_ROWS` / `DEBUG` / `LOG_LEVEL` env vars are not read by
> the server (only `WORKBENCH_API_URL` and `WORKBENCH_AUTH_TOKEN` are); `insert_data` inserts one
> row per call, not a bulk batch; and audit logging (see below) isn't built. Treat multi-step
> "Claude will: 1, 2, 3..." example workflows as illustrations of intent, not literal transcripts.

## What is MCP?

**Model Context Protocol (MCP)** is an open standard that enables AI models to interact with external tools and data sources. With MCP, Claude can:

- 🔍 Explore your database schemas automatically
- 📊 Execute queries and analyze results
- 🛠️ Create tables, add columns, modify indexes
- 📈 Generate synthetic data for testing
- 🚀 Optimize slow queries
- 📋 Manage database structure and organization

## Prerequisites

- Workbench running locally or deployed
- Claude Desktop or API access with MCP support
- Basic knowledge of your database structure

## 1. Start the MCP Server

### Option A: From Source

```bash
cd /path/to/workbench
pnpm --filter @workbench/mcp-server build
pnpm --filter @workbench/mcp-server dev
```

Server will be available on stdio (ready for MCP protocol).

### Option B: Docker

```bash
docker run -e WORKBENCH_API_URL=http://host.docker.internal:4000/graphql \
           -e WORKBENCH_AUTH_TOKEN=$YOUR_TOKEN \
           -p 3001:3001 \
           workbench-mcp-server:latest
```

## 2. Configure Claude Desktop

Add the MCP server configuration to Claude's `claude.json`:

### On macOS

```bash
# Edit Claude's MCP config
nano ~/Library/Application\ Support/Claude/claude.json
```

### Configuration Template

```json
{
  "mcpServers": {
    "workbench": {
      "command": "node",
      "args": ["/path/to/workbench/packages/mcp-server/dist/mcp-server.js"],
      "env": {
        "WORKBENCH_API_URL": "http://localhost:4000/graphql",
        "WORKBENCH_AUTH_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

### Finding Your Auth Token

Two options:

1. **From the running web app**: log into Workbench, open DevTools console, and run:
   ```js
   JSON.parse(localStorage.getItem('workbench_auth_store')).state.accessToken
   ```
   (the web app persists auth state there via Zustand; tokens are short-lived — see
   `apps/api/.env`'s `JWT_SECRET`/expiry — so you'll need to re-fetch this after it expires)

2. **Directly via GraphQL** (no browser needed):
   ```bash
   curl -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{
     "query": "mutation($input: LoginInput!) { login(input: $input) { accessToken } }",
     "variables": { "input": { "email": "you@example.com", "password": "..." } }
   }'
   ```

## 3. Restart Claude

Close and reopen Claude Desktop. You should see the Workbench MCP server connected in the Tools menu.

## 4. Example Prompts

Now you can ask Claude to work with your databases:

### Schema Discovery

```
"Show me the schema of the users table in my PostgreSQL database"
```

Claude will:
1. Call `get_schema` tool
2. Return table columns, types, constraints
3. Show you foreign key relationships

### Query Execution

```
"Execute a query to count how many users are active and group by created_date"
```

Claude will:
1. Build the SQL query
2. Call `execute_query` tool
3. Return results and show summary

### Schema Modification

```
"Add a 'last_login' timestamp column to the users table with a default of NOW()"
```

Claude will:
1. Call `add_column` tool
2. Verify column was created
3. Show you the DDL statement used

### Performance Analysis

```
"Analyze this query for performance issues and suggest indexes:
SELECT * FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.created_at > NOW() - INTERVAL '30 days'
ORDER BY o.total DESC"
```

Claude will:
1. Call `analyze_query_performance` tool
2. Return execution plan
3. Recommend indexes
4. Suggest rewrite strategies

### Data Generation

```
"Generate 100 sample users with realistic data (name, email, phone, created_at) and insert them into the users table"
```

Claude will:
1. Build INSERT statements with synthetic data
2. Call `insert_data` tool
3. Verify rows were inserted

### Multi-Database Coordination

```
"Compare the schema of my PostgreSQL and MySQL databases and show me any differences"
```

Claude will:
1. Call `get_schema` for PostgreSQL connection
2. Call `get_schema` for MySQL connection
3. Provide detailed diff report

## 5. Security Best Practices

### Token Management

```bash
# Use environment variables instead of hardcoding tokens
export WORKBENCH_AUTH_TOKEN=$(cat ~/.workbench-token)

# Rotate tokens regularly
# Tokens should have minimal required permissions
```

### Workspace Isolation

Always specify a workspace in requests:

```json
{
  "workspace_id": "prod-workspace"
}
```

### Audit Logging

**Not implemented.** There is no `agentActions` query or agent-tracking table in the API —
every MCP tool call is a plain GraphQL request under the hood, so it shows up wherever your
GraphQL access logs already are (if any), same as a request from the web app. Adding a
dedicated agent-action audit trail (who called which tool, with what parameters, when) is a
real, separate feature — not yet built.

## 6. Common Issues

### "Connection refused"

```
Error: Could not connect to WORKBENCH_API_URL
```

**Solution:**
- Verify Workbench API is running: `curl http://localhost:4000/graphql`
- Check WORKBENCH_API_URL environment variable
- Ensure firewall allows localhost:4000

### "Unauthorized - Invalid token"

```
Error: Unauthorized: Token validation failed
```

**Solution:**
- Verify WORKBENCH_AUTH_TOKEN is set
- Check token hasn't expired
- Regenerate token from Workbench UI

### "Tool not available"

```
Error: Tool 'execute_query' not found
```

**Solution:**
- Rebuild MCP server: `pnpm --filter @workbench/mcp-server build`
- Restart Claude Desktop
- Check console logs: `tail -f ~/.claude-mcp.log`

### Slow Tool Responses

**Solution:**
- Check network latency: `ping localhost`
- Monitor API response times: `curl -w "Total: %{time_total}s\n" http://localhost:4000/graphql`
- Increase timeout: `WORKBENCH_REQUEST_TIMEOUT=60000`

## 7. Advanced Configuration

### Multiple Workspaces

Configure multiple Workbench instances:

```json
{
  "mcpServers": {
    "workbench-prod": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "WORKBENCH_API_URL": "https://workbench.prod.example.com/graphql",
        "WORKBENCH_AUTH_TOKEN": "prod-token"
      }
    },
    "workbench-staging": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "WORKBENCH_API_URL": "https://workbench.staging.example.com/graphql",
        "WORKBENCH_AUTH_TOKEN": "staging-token"
      }
    }
  }
}
```

Then in Claude:

```
"Using the workbench-prod server, show me the production schema"
"Now compare it to workbench-staging"
```

### Custom Tool Limits

```json
{
  "mcpServers": {
    "workbench": {
      "env": {
        "WORKBENCH_QUERY_LIMIT": "1000",
        "WORKBENCH_TIMEOUT_MS": "30000",
        "WORKBENCH_MAX_ROWS": "10000"
      }
    }
  }
}
```

### Logging

Enable verbose logging:

```json
{
  "mcpServers": {
    "workbench": {
      "env": {
        "DEBUG": "workbench:*",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

Check logs:

```bash
tail -100f ~/.claude-mcp.log | grep workbench
```

## 8. Available Tools

The Workbench MCP server provides 24 tools:

### Connection Management (4)
- `list_connections` - List all database connections
- `get_connection_details` - Get connection metadata
- `test_connection` - Test connection validity
- `create_connection` - Add new database connection

### Schema Management (8)
- `get_schema` - Fetch complete schema structure
- `get_table_structure` - Get table definition
- `get_table_indexes` - List table indexes
- `get_table_relationships` - Show foreign keys
- `create_table` - Create new table with columns
- `add_column` - Add column to existing table
- `drop_column` - Remove column
- `create_index` - Create database index

### Query Execution (5)
- `execute_query` - Run SELECT/INSERT/UPDATE/DELETE
- `execute_query_with_params` - Best-effort client-side value escaping for ?/$N placeholders (NOT a true bind parameter — the API has no parameterized-query support)
- `insert_data` - Batch insert data
- `update_data` - Update records by criteria
- `delete_data` - Delete records by criteria

### Workspace Management (3)
- `get_current_workspace` - Current workspace info
- `list_workspaces` - List all workspaces
- `switch_workspace` - Change active workspace

### Data Inspection (4)
- `get_table_row_count` - Count table rows
- `get_table_stats` - Row count, column count, index count, primary key (no disk size — not exposed by the API)
- `analyze_query_performance` - Query plan analysis
- `get_slow_queries` - NOT SUPPORTED (no slow-query-log API exists); returns an explicit error

## 9. Example Agent Workflows

### Workflow 1: Database Health Check

```
User: "Give me a health report of my production database"

Claude:
1. Calls list_connections → sees all database connections
2. Calls get_table_stats for each table → size, row count
3. Calls get_slow_queries → recent performance issues
4. Calls analyze_query_performance on slow queries
5. Returns comprehensive health report with recommendations
```

### Workflow 2: Schema Synchronization

```
User: "Sync the users table schema from production to staging"

Claude:
1. Calls get_table_structure on production connection
2. Calls get_table_structure on staging connection
3. Compares schemas
4. Identifies differences
5. Calls add_column/drop_column on staging to match production
6. Verifies sync with final get_table_structure call
```

### Workflow 3: Automated Testing Data

```
User: "Generate test data: 500 users with realistic profiles, 10000 orders with random dates in the last year"

Claude:
1. Calls get_table_structure to understand columns
2. Generates synthetic data with faker
3. Calls insert_data to bulk insert
4. Verifies with get_table_row_count
5. Shows sample data to confirm quality
```

## 10. Next Steps

- Read [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) for architecture details
- See [MCP_IMPLEMENTATION.md](./docs/MCP_IMPLEMENTATION.md) for handler development
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for local development setup
- Join discussions on implementing additional agent capabilities

---

## Need Help?

- 💬 Check [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for common issues
- 🐛 Report issues on GitHub
- 📖 Read the full [MCP Server README](./packages/mcp-server/README.md)
- 🚀 Deploy to production with our [Docker guide](./docs/DEPLOYMENT.md)
