# MCP Integration Guide

This guide explains how to integrate AI agents with Universal Database Workbench using Model Context Protocol (MCP).

## What is MCP?

**Model Context Protocol** is an open standard that allows AI models (like Claude) to safely interact with tools and data sources. MCP provides:

- **Structured tool definitions** - Clear interface for AI agents
- **Type safety** - Prevents misuse and errors
- **Audit trail** - Track all AI agent actions
- **Rate limiting** - Prevent abuse
- **Secure authentication** - JWT-based access control

## Why Add MCP to Workbench?

### Before MCP
```
User: "Create a users table with id, email, and created_at columns"

Developer must:
1. Use Workbench UI manually
2. Or write custom scripts
3. Or use multiple tools

Result: Time-consuming, error-prone
```

### With MCP
```
User: "Create a users table with id, email, and created_at columns"

AI Agent (using Workbench MCP):
1. Automatically discovers available databases
2. Gets schema constraints and existing patterns
3. Generates and executes CREATE TABLE statement
4. Verifies successful creation
5. Reports back to user

Result: Seconds, fully audited, consistent
```

## Use Cases for MCP + Agents

### 1. Autonomous Database Management
```
Task: "Migrate schema from dev to production"

Agent can:
- Compare schemas between databases
- Generate migration scripts
- Execute with validation
- Rollback on errors
- Report changes
```

### 2. Intelligent Query Optimization
```
Task: "Optimize our slow queries"

Agent can:
- Analyze all queries with EXPLAIN PLAN
- Identify missing indexes
- Suggest optimizations
- Create indexes
- Monitor performance improvements
```

### 3. Data Generation & Testing
```
Task: "Generate 1000 test records for the users table"

Agent can:
- Analyze table schema
- Generate realistic data
- Insert records
- Create relationships correctly
- Generate verification report
```

### 4. Schema Evolution
```
Task: "Add notifications feature to our app"

Agent can:
- Design schema for notifications
- Create necessary tables
- Add foreign keys
- Create indexes for performance
- Generate migration scripts
```

### 5. Compliance & Auditing
```
Task: "Identify all PII and ensure it's properly encrypted"

Agent can:
- Scan all schemas
- Identify PII columns
- Verify encryption
- Report gaps
- Suggest fixes
```

## Architecture: How MCP Connects

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (Claude)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                MCP Protocol (JSON-RPC)
                     │
┌────────────────────▼────────────────────────────────────┐
│         Workbench MCP Server Package                    │
│   packages/mcp-server/src/mcp-server.ts                 │
│                                                          │
│  • Tool discovery                                        │
│  • Request routing                                       │
│  • Authentication                                        │
│  • Error handling                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                GraphQL API
                     │
┌────────────────────▼────────────────────────────────────┐
│        Workbench GraphQL API (NestJS)                   │
│          apps/api/src/modules/                          │
│                                                          │
│  • Connection Manager (list, test, create)              │
│  • Schema Inspector (introspection)                     │
│  • SQL Engine (query execution)                         │
│  • Tenancy (workspace isolation)                        │
│  • Audit Logging (track agent actions)                  │
└────────────────────┬────────────────────────────────────┘
                     │
           Database Drivers Package
                     │
        ┌────────────┼────────────┐
        │            │            │
   PostgreSQL      MySQL        MSSQL
```

## Implementation Steps

### Phase 1: Core MCP Server (Current)

**What's included:**
- ✅ MCP server framework
- ✅ Tool definitions for all operations
- ✅ TypeScript types and interfaces
- ✅ Package structure

**Status:** Foundation complete, handlers pending

### Phase 2: GraphQL Integration (Next)

1. **Connect MCP handlers to GraphQL API**
   ```typescript
   // In mcp-server.ts handler implementations
   private async handleExecuteQuery(args: McpToolInput): Promise<string> {
     const query = `
       query ExecuteQuery($connectionId: ID!, $sql: String!) {
         executeQuery(connectionId: $connectionId, sql: $sql) {
           rows
           rowCount
         }
       }
     `;
     
     const result = await this.graphqlClient.request(query, {
       connectionId: args.connection_id,
       sql: args.query,
     });
     
     return JSON.stringify(result);
   }
   ```

2. **Extend GraphQL schema for agent tracking**
   ```graphql
   # Track which agents performed which actions
   type AgentAction {
     id: ID!
     agentId: String!
     agentName: String!
     action: String!
     parameters: JSON!
     result: JSON!
     status: String!
     error: String
     createdAt: DateTime!
   }
   ```

3. **Add audit logging**
   - Log all agent actions
   - Track parameters and results
   - Enable compliance reporting

### Phase 3: Agent Features

1. **Tool-use loops** - Agents can refine queries
2. **State management** - Track agent context
3. **Caching** - Cache schema for performance
4. **Streaming** - Support long-running operations

## Configuration

### MCP Server Environment

```bash
# Start MCP server with Workbench API
export WORKBENCH_API_URL=http://localhost:4000/graphql
export WORKBENCH_AUTH_TOKEN=your-jwt-token
pnpm --filter @workbench/mcp-server start
```

### Configure for Claude

**Option 1: Claude.json (Recommended)**
```json
{
  "mcpServers": {
    "workbench": {
      "command": "node",
      "args": ["packages/mcp-server/dist/mcp-server.js"],
      "env": {
        "WORKBENCH_API_URL": "http://localhost:4000/graphql",
        "WORKBENCH_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Option 2: Environment Variables**
```bash
export WORKBENCH_API_URL=http://localhost:4000/graphql
export WORKBENCH_AUTH_TOKEN=your-token
export WORKBENCH_WORKSPACE_ID=your-workspace-id
```

## Example: Agent Interaction Flow

### Scenario: "Add email verification to our users table"

```
1. User → Claude: "Add email verification column to users table"

2. Claude queries MCP tools:
   - get_table_structure("users")
   - Response: columns=[id, email, password, created_at]

3. Claude executes:
   - add_column("users", "email_verified", "BOOLEAN", nullable=false, default=false)
   - create_index("users", "idx_users_email", columns=["email"])
   
4. Claude verifies:
   - get_table_structure("users") 
   - Response confirms new columns added

5. Claude returns to user:
   "✅ Added email_verified column (BOOLEAN, NOT NULL, DEFAULT FALSE)
    ✅ Created index on email column for performance
    Changes are live in production"
```

## Security Considerations

### 1. Authentication
- MCP server requires valid JWT token
- Token must have workspace access
- Tokens expire and auto-refresh

### 2. Authorization
- Agent actions inherit user permissions
- Cannot access workspaces user doesn't have access to
- Row-level security applied to all queries

### 3. Input Validation
- All parameters validated before execution
- SQL injection prevented via parameterized queries
- File paths sanitized
- Rate limiting prevents abuse

### 4. Audit Trail
- Every agent action logged
- Includes parameters, results, errors
- Timestamps and user attribution
- Exportable for compliance

### 5. Scope Limitation
- Agents operate within single workspace
- Cannot modify system configuration
- Cannot access other users' credentials
- Sensitive fields redacted in responses

## Monitoring & Logging

### View Agent Actions

```bash
# Query all agent actions for a workspace
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { agentActions { id agentName action createdAt } }"
  }'
```

### Debug MCP Server

```bash
# Enable verbose logging
DEBUG=workbench:* pnpm --filter @workbench/mcp-server dev

# Watch for errors
tail -f workbench-mcp.log | grep ERROR
```

## Testing

### Manual Testing

```bash
# Start all services
pnpm dev

# Start MCP server in separate terminal
pnpm --filter @workbench/mcp-server dev

# Test with Claude CLI
claude mcp test packages/mcp-server/dist/mcp-server.js
```

### Integration Tests

```typescript
// Test MCP tool execution
import { WorkbenchMcpServer } from '@workbench/mcp-server';

const server = new WorkbenchMcpServer();

// Simulate agent calling a tool
const result = await server.executeTool('get_schema', {
  connection_id: 'test-connection'
});

expect(result.content[0].type).toBe('text');
expect(JSON.parse(result.content[0].text)).toHaveProperty('tables');
```

## Roadmap

### Q1 2025
- [ ] Complete GraphQL integration
- [ ] Add audit logging for agent actions
- [ ] Implement agent rate limiting
- [ ] Add agent-specific metrics

### Q2 2025
- [ ] Advanced query optimization recommendations
- [ ] Schema migration helpers
- [ ] Data validation tools
- [ ] Backup/restore automation

### Q3 2025
- [ ] Multi-database schema sync
- [ ] Performance tuning automation
- [ ] Compliance scanning
- [ ] Custom agent workflows

## Troubleshooting

### "MCP server connection failed"
```bash
# Check server is running
ps aux | grep mcp-server

# Check API is accessible
curl http://localhost:4000/graphql

# Verify auth token
echo $WORKBENCH_AUTH_TOKEN
```

### "Tool returned an error"
```bash
# Enable debug logging
DEBUG=workbench:* pnpm --filter @workbench/mcp-server dev

# Check GraphQL API error response
# Review audit log in Workbench UI
```

### "Authentication failed"
```bash
# Generate new token via Workbench UI
# Or use GraphQL to generate token:
mutation { login(email: "you@example.com", password: "...") { token } }

# Update token in environment
export WORKBENCH_AUTH_TOKEN=new-token
```

## FAQ

**Q: Can agents modify production databases?**  
A: Yes, but with safeguards: authentication required, audit logged, same permissions as user, rate limited.

**Q: What if an agent makes a mistake?**  
A: All changes logged with timestamps. Can be rolled back. Audit trail shows exactly what happened.

**Q: How do agents discover what they can do?**  
A: MCP protocol provides tool discovery. Agents query available tools and their parameters.

**Q: Can multiple agents coordinate?**  
A: Yes, they operate within same workspace with same data and permissions.

**Q: Is this production-ready?**  
A: Roadmap indicates core features for Q1 2025. Currently suitable for testing and development.

## Next Steps

1. **Start MCP server**: `pnpm --filter @workbench/mcp-server dev`
2. **Connect to Claude**: Add to claude.json
3. **Test a tool**: Ask Claude to list database connections
4. **Explore capabilities**: Try schema discovery, query execution
5. **Build automation**: Create agent workflows for your use case

---

For more details, see:
- [MCP Server README](./packages/mcp-server/README.md)
- [Workbench Architecture](./ARCHITECTURE.md)
- [GraphQL API Docs](./docs/graphql-api.md)
- [Contributing Guide](./CONTRIBUTING.md)
