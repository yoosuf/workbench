# MCP Server Implementation Guide

Complete guide to implementing the MCP server's tool handlers to connect with the Workbench GraphQL API.

## Overview

The MCP server acts as a bridge between AI agents and the Workbench platform. Tool handlers translate MCP tool calls into GraphQL queries/mutations that interact with the Workbench API.

## Handler Implementation Pattern

Each tool handler follows this pattern:

```typescript
private async handleToolName(args: McpToolInput): Promise<string> {
  // 1. Validate input
  // 2. Build GraphQL query/mutation
  // 3. Execute via GraphQL client
  // 4. Format response
  // 5. Return JSON string
}
```

## GraphQL Client Setup

First, create a GraphQL client in the MCP server:

```typescript
// packages/mcp-server/src/graphql-client.ts
import { GraphQLClient } from 'graphql-request';

export class WorkbenchGraphQLClient {
  private client: GraphQLClient;

  constructor(apiUrl: string, authToken: string) {
    this.client = new GraphQLClient(apiUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  async request(query: string, variables?: Record<string, unknown>) {
    return this.client.request(query, variables);
  }
}
```

## Example Handler Implementations

### 1. List Connections

```typescript
private async handleListConnections(args: McpToolInput): Promise<string> {
  const query = `
    query ListConnections($workspaceId: ID) {
      connections(workspaceId: $workspaceId) {
        id
        name
        type
        host
        port
        database
        isActive
        createdAt
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(query, {
      workspaceId: args.workspace_id || null,
    });

    return JSON.stringify({
      success: true,
      connections: result.connections,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### 2. Execute Query

```typescript
private async handleExecuteQuery(args: McpToolInput): Promise<string> {
  const query = `
    mutation ExecuteQuery(
      $connectionId: ID!
      $sql: String!
      $limit: Int
    ) {
      executeQuery(
        connectionId: $connectionId
        sql: $sql
        limit: $limit
      ) {
        rows
        rowCount
        columns {
          name
          type
        }
        executionTimeMs
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(query, {
      connectionId: args.connection_id,
      sql: args.query,
      limit: args.limit || 100,
    });

    return JSON.stringify({
      success: true,
      data: result.executeQuery,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
    });
  }
}
```

### 3. Get Schema

```typescript
private async handleGetSchema(args: McpToolInput): Promise<string> {
  const query = `
    query GetSchema(
      $connectionId: ID!
      $schemaName: String
    ) {
      schema(
        connectionId: $connectionId
        schemaName: $schemaName
      ) {
        tables {
          name
          columns {
            name
            type
            nullable
            isPrimaryKey
            defaultValue
          }
          indexes {
            name
            columns
            isUnique
          }
          foreignKeys {
            name
            columns
            referencedTable
            referencedColumns
          }
        }
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(query, {
      connectionId: args.connection_id,
      schemaName: args.schema_name || null,
    });

    return JSON.stringify({
      success: true,
      schema: result.schema,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get schema',
    });
  }
}
```

### 4. Create Table

```typescript
private async handleCreateTable(args: McpToolInput): Promise<string> {
  let columns;
  try {
    columns = JSON.parse(args.columns as string);
  } catch {
    return JSON.stringify({
      success: false,
      error: 'Invalid columns JSON format',
    });
  }

  const mutation = `
    mutation CreateTable(
      $connectionId: ID!
      $tableName: String!
      $columns: JSON!
    ) {
      createTable(
        connectionId: $connectionId
        tableName: $tableName
        columns: $columns
      ) {
        id
        name
        created
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(mutation, {
      connectionId: args.connection_id,
      tableName: args.table_name,
      columns: columns,
    });

    return JSON.stringify({
      success: true,
      table: result.createTable,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create table',
    });
  }
}
```

### 5. Add Column

```typescript
private async handleAddColumn(args: McpToolInput): Promise<string> {
  const mutation = `
    mutation AddColumn(
      $connectionId: ID!
      $tableName: String!
      $columnName: String!
      $columnType: String!
      $nullable: Boolean
      $defaultValue: String
    ) {
      addColumn(
        connectionId: $connectionId
        tableName: $tableName
        columnName: $columnName
        columnType: $columnType
        nullable: $nullable
        defaultValue: $defaultValue
      ) {
        name
        type
        nullable
        defaultValue
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(mutation, {
      connectionId: args.connection_id,
      tableName: args.table_name,
      columnName: args.column_name,
      columnType: args.column_type,
      nullable: args.nullable || false,
      defaultValue: args.default || null,
    });

    return JSON.stringify({
      success: true,
      column: result.addColumn,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add column',
    });
  }
}
```

### 6. Insert Data

```typescript
private async handleInsertData(args: McpToolInput): Promise<string> {
  let data;
  try {
    data = JSON.parse(args.data as string);
  } catch {
    return JSON.stringify({
      success: false,
      error: 'Invalid data JSON format',
    });
  }

  const mutation = `
    mutation InsertData(
      $connectionId: ID!
      $tableName: String!
      $data: JSON!
    ) {
      insertData(
        connectionId: $connectionId
        tableName: $tableName
        data: $data
      ) {
        success
        rowsAffected
        lastInsertId
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(mutation, {
      connectionId: args.connection_id,
      tableName: args.table_name,
      data: data,
    });

    return JSON.stringify({
      success: true,
      result: result.insertData,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to insert data',
    });
  }
}
```

### 7. Analyze Query Performance

```typescript
private async handleAnalyzeQueryPerformance(args: McpToolInput): Promise<string> {
  const query = `
    query AnalyzeQuery(
      $connectionId: ID!
      $sql: String!
    ) {
      analyzeQuery(
        connectionId: $connectionId
        sql: $sql
      ) {
        executionPlan
        estimatedRowCount
        indexUsed
        recommendations {
          type
          description
          impact
        }
      }
    }
  `;

  try {
    const result = await this.graphqlClient.request(query, {
      connectionId: args.connection_id,
      sql: args.query,
    });

    return JSON.stringify({
      success: true,
      analysis: result.analyzeQuery,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze query',
    });
  }
}
```

## Error Handling

Implement consistent error handling across all handlers:

```typescript
private async executeGraphQLRequest(
  query: string,
  variables: Record<string, unknown>,
  context: string, // e.g., "execute_query"
): Promise<string> {
  try {
    const result = await this.graphqlClient.request(query, variables);
    
    // Check for GraphQL errors in response
    if (result.errors) {
      return JSON.stringify({
        success: false,
        error: result.errors[0].message,
        context,
      });
    }

    return JSON.stringify({
      success: true,
      data: result,
    });
  } catch (error) {
    // Network errors, timeout, etc.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`MCP Handler Error [${context}]:`, errorMessage);

    return JSON.stringify({
      success: false,
      error: errorMessage,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Implementing All Handlers

Here's the complete updated MCP server with all handlers implemented:

```typescript
// packages/mcp-server/src/mcp-server-complete.ts
import { WorkbenchGraphQLClient } from './graphql-client';

export class WorkbenchMcpServer {
  private graphqlClient: WorkbenchGraphQLClient;

  constructor() {
    const apiUrl = process.env.WORKBENCH_API_URL || 'http://localhost:4000/graphql';
    const authToken = process.env.WORKBENCH_AUTH_TOKEN || '';
    
    this.graphqlClient = new WorkbenchGraphQLClient(apiUrl, authToken);
    
    // ... rest of initialization
  }

  // Implement all handlers using the patterns above
  // Each handler should:
  // 1. Validate input parameters
  // 2. Build GraphQL query/mutation
  // 3. Execute request with error handling
  // 4. Format response as JSON
  // 5. Return as string for MCP protocol
}
```

## Testing Handlers

Create tests for each handler:

```typescript
// packages/mcp-server/src/mcp-server.test.ts
import { describe, it, expect } from 'vitest';
import { WorkbenchMcpServer } from './mcp-server';

describe('MCP Server Handlers', () => {
  let server: WorkbenchMcpServer;

  beforeEach(() => {
    server = new WorkbenchMcpServer();
  });

  it('should list connections', async () => {
    const result = await server.executeTool('list_connections', {
      workspace_id: 'test-workspace',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(Array.isArray(response.connections)).toBe(true);
  });

  it('should execute queries', async () => {
    const result = await server.executeTool('execute_query', {
      connection_id: 'test-connection',
      query: 'SELECT COUNT(*) as count FROM users',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('rowCount');
  });

  // Add more tests for each handler
});
```

## Integration with GraphQL API

The GraphQL API needs to support the MCP server's requirements:

1. **Authentication**: JWT token validation for MCP requests
2. **Agent Tracking**: Record which agent performed which action
3. **Audit Logging**: Log all agent actions for compliance
4. **Error Responses**: Consistent error format for MCP parsing

See [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) for GraphQL schema extensions.

## Deployment

### Build MCP Server

```bash
pnpm --filter @workbench/mcp-server build
```

### Start in Production

```bash
export WORKBENCH_API_URL=https://workbench.yourcompany.com/graphql
export WORKBENCH_AUTH_TOKEN=$YOUR_SERVICE_TOKEN
node packages/mcp-server/dist/mcp-server.js
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY packages/mcp-server ./packages/mcp-server
COPY packages/shared-types ./packages/shared-types

RUN pnpm install
RUN pnpm --filter @workbench/mcp-server build

ENV WORKBENCH_API_URL=http://api:4000/graphql
ENV WORKBENCH_REQUEST_TIMEOUT=30000

CMD ["node", "packages/mcp-server/dist/mcp-server.js"]
```

## Next Steps

1. Implement all handlers using the patterns above
2. Add error handling and logging
3. Write comprehensive tests
4. Deploy and monitor
5. Gather agent feedback and iterate

---

For more info:
- [MCP Integration Guide](./MCP_INTEGRATION.md)
- [MCP Server Package README](./packages/mcp-server/README.md)
- [GraphQL API Documentation](./docs/graphql-api.md)
