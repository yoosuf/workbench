import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { WorkbenchGraphQLClient } from './graphql-client.js';
import { quoteIdent, qualifiedTable, quoteLiteral } from './sql-utils.js';

interface McpToolInput {
  [key: string]: string | number | boolean | undefined;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

const CONNECTION_FIELDS = `
  id name engine host port database username accessLevel effectiveAccessLevel createdAt
`;

const TABLE_DETAIL_FIELDS = `
  name kind schema
  columns { name nativeType dataKind nullable defaultValue isAutoIncrement ordinalPosition isPrimaryKey isForeignKey }
  primaryKey
  foreignKeys { name columns referencedTable referencedColumns onDelete onUpdate }
  indexes { name columns isUnique type }
`;

/**
 * MCP Server for Database Workbench.
 *
 * Talks to the real Workbench GraphQL API (apps/api) as an authenticated user — it does not
 * re-implement permission checks or talk to target databases directly. Every tool call is a
 * GraphQL query/mutation against operations that actually exist in
 * apps/api/src/modules/*\/*.resolver.ts; see docs/MCP_IMPLEMENTATION.md for the mapping
 * rationale and the operations that have no server-side equivalent (documented per-tool below).
 */
export class WorkbenchMcpServer {
  private server: Server;
  private tools: ToolDefinition[] = [];
  private graphqlClient: WorkbenchGraphQLClient;

  constructor() {
    const apiUrl = process.env.WORKBENCH_API_URL || 'http://localhost:4000/graphql';
    const authToken = process.env.WORKBENCH_AUTH_TOKEN || '';
    if (!authToken) {
      console.error(
        'Warning: WORKBENCH_AUTH_TOKEN is not set. Every tool call will fail auth. ' +
          'Obtain one via the `login` mutation (same credentials as the web app) and set it ' +
          'in the MCP server env config.',
      );
    }
    this.graphqlClient = new WorkbenchGraphQLClient(apiUrl, authToken);

    this.server = new Server(
      {
        name: 'workbench-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
    this.registerTools();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.executeTool(name, (args || {}) as McpToolInput);
    });
  }

  private registerTools(): void {
    this.registerConnectionTools();
    this.registerSchemaTools();
    this.registerQueryTools();
    this.registerWorkspaceTools();
    this.registerInspectionTools();
  }

  private registerConnectionTools(): void {
    this.tools.push({
      name: 'list_connections',
      description: 'List saved database connections accessible to the authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            description: 'Workspace ID to scope to (optional — omit to list across all accessible workspaces)',
          },
        },
        required: [],
      },
    });

    this.tools.push({
      name: 'get_connection_details',
      description: 'Get details about a specific saved database connection (never returns the password)',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
        },
        required: ['connection_id'],
      },
    });

    this.tools.push({
      name: 'test_connection',
      description: 'Test whether a saved connection can currently reach its target database',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID to test' },
        },
        required: ['connection_id'],
      },
    });

    this.tools.push({
      name: 'create_connection',
      description: 'Save a new database connection',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Connection display name' },
          type: { type: 'string', enum: ['postgres', 'mysql', 'mssql'], description: 'Database engine' },
          host: { type: 'string', description: 'Database host' },
          port: { type: 'number', description: 'Database port' },
          database: { type: 'string', description: 'Database/catalog name' },
          username: { type: 'string', description: 'Username for authentication' },
          password: { type: 'string', description: 'Password for authentication' },
          workspace_id: { type: 'string', description: 'Workspace to save the connection in (optional — uses your default workspace)' },
        },
        required: ['name', 'type', 'host', 'port', 'database', 'username', 'password'],
      },
    });
  }

  private registerSchemaTools(): void {
    this.tools.push({
      name: 'get_schema',
      description: 'Get schema(s) for a connection, including every table with its columns, primary key, foreign keys, and indexes',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          schema_name: { type: 'string', description: 'Limit to one schema (optional — omit to fetch all schemas, which is more expensive)' },
        },
        required: ['connection_id'],
      },
    });

    this.tools.push({
      name: 'get_table_structure',
      description: 'Get detailed structure of one table: columns, types, primary key, foreign keys, indexes',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public'; use 'dbo' for MSSQL)" },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'get_table_indexes',
      description: 'Get all indexes for a specific table',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'get_table_relationships',
      description: 'Get foreign key relationships for a table',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'create_table',
      description: 'Create a new table',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Name of the table to create' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          primary_key_column: { type: 'string', description: "Primary key column name (default: 'id', auto-increment integer)" },
          auto_timestamps: { type: 'boolean', description: 'Add created_at/updated_at columns (default: true)' },
          columns: {
            type: 'string',
            description: 'JSON array of additional columns: [{"name","type","nullable","default","isUnique"}]',
          },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'add_column',
      description: 'Add a new column to an existing table',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          column_name: { type: 'string', description: 'Name of the new column' },
          column_type: { type: 'string', description: 'Native column type (e.g., VARCHAR(255), INT, TIMESTAMP)' },
          nullable: { type: 'boolean', description: 'Whether column allows NULL (default: true)' },
          default: { type: 'string', description: 'Default value expression (optional)' },
        },
        required: ['connection_id', 'table_name', 'column_name', 'column_type'],
      },
    });

    this.tools.push({
      name: 'drop_column',
      description: "Remove a column from a table (built as raw DDL — there's no dedicated API mutation for this)",
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          column_name: { type: 'string', description: 'Name of the column to drop' },
        },
        required: ['connection_id', 'table_name', 'column_name'],
      },
    });

    this.tools.push({
      name: 'create_index',
      description: "Create an index on one or more columns (built as raw DDL — there's no dedicated API mutation for this)",
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          index_name: { type: 'string', description: 'Name of the index' },
          columns: { type: 'string', description: 'Comma-separated list of column names' },
          unique: { type: 'boolean', description: 'Whether the index should be unique' },
        },
        required: ['connection_id', 'table_name', 'index_name', 'columns'],
      },
    });
  }

  private registerQueryTools(): void {
    this.tools.push({
      name: 'execute_query',
      description: 'Execute a raw SQL query and return results (server caps rows/time by default; large limits relax the cap automatically)',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          query: { type: 'string', description: 'SQL query to execute' },
          limit: { type: 'number', description: 'Row count you expect back — pass >10000 to request the relaxed server cap (up to 1,000,000 rows / 120s)' },
        },
        required: ['connection_id', 'query'],
      },
    });

    this.tools.push({
      name: 'execute_query_with_params',
      description:
        'Execute SQL with ? or $1,$2,... placeholders, substituting escaped values client-side. ' +
        'NOTE: the Workbench API has no server-side bind-parameter support — this is best-effort ' +
        'literal escaping, not a true parameterized query. Prefer execute_query with carefully ' +
        'constructed SQL when possible.',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          query: { type: 'string', description: 'SQL query with ? or $1, $2 placeholders' },
          parameters: { type: 'string', description: 'JSON array of parameter values, in order' },
        },
        required: ['connection_id', 'query', 'parameters'],
      },
    });

    this.tools.push({
      name: 'insert_data',
      description: "Insert one row into a table (built as raw SQL — there's no dedicated API mutation for this)",
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          data: { type: 'string', description: 'JSON object mapping column names to values' },
        },
        required: ['connection_id', 'table_name', 'data'],
      },
    });

    this.tools.push({
      name: 'update_data',
      description: "Update records in a table (built as raw SQL). where_clause is required — refuses an unconditional UPDATE.",
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          data: { type: 'string', description: 'JSON object mapping column names to new values' },
          where_clause: { type: 'string', description: 'Raw SQL WHERE condition, e.g. "id = 5" (required, non-empty)' },
        },
        required: ['connection_id', 'table_name', 'data', 'where_clause'],
      },
    });

    this.tools.push({
      name: 'delete_data',
      description: "Delete records from a table (built as raw SQL). where_clause is required — refuses an unconditional DELETE.",
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
          where_clause: { type: 'string', description: 'Raw SQL WHERE condition (required, non-empty)' },
        },
        required: ['connection_id', 'table_name', 'where_clause'],
      },
    });
  }

  private registerWorkspaceTools(): void {
    this.tools.push({
      name: 'get_current_workspace',
      description:
        'Workbench has no server-side "current workspace" concept — this lists your accessible workspaces so you can pick one to pass explicitly to other tools',
      inputSchema: { type: 'object', properties: {}, required: [] },
    });

    this.tools.push({
      name: 'list_workspaces',
      description: 'List all workspaces accessible to the authenticated user',
      inputSchema: { type: 'object', properties: {}, required: [] },
    });

    this.tools.push({
      name: 'switch_workspace',
      description:
        'Validates a workspace is accessible and returns its details. Does not change server state (there is no session to switch) — pass this workspace_id explicitly to subsequent tool calls.',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: { type: 'string', description: 'Workspace ID to validate' },
        },
        required: ['workspace_id'],
      },
    });
  }

  private registerInspectionTools(): void {
    this.tools.push({
      name: 'get_table_row_count',
      description: 'Get the exact number of rows in a table',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'get_table_stats',
      description: 'Get row count, column count, index count, and primary key for a table (storage size on disk is not available via the API)',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          table_name: { type: 'string', description: 'Table name' },
          schema: { type: 'string', description: "Schema name (default: 'public')" },
        },
        required: ['connection_id', 'table_name'],
      },
    });

    this.tools.push({
      name: 'analyze_query_performance',
      description: 'Get the query planner output (EXPLAIN) for a SQL query without executing it. PostgreSQL and MySQL only — not yet supported for MSSQL.',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          query: { type: 'string', description: 'SQL query to analyze' },
        },
        required: ['connection_id', 'query'],
      },
    });

    this.tools.push({
      name: 'get_slow_queries',
      description: 'NOT SUPPORTED — the Workbench API does not expose database slow-query logs. Use analyze_query_performance on a specific query instead.',
      inputSchema: {
        type: 'object',
        properties: {
          connection_id: { type: 'string', description: 'Connection ID' },
          limit: { type: 'number', description: 'Unused' },
        },
        required: ['connection_id'],
      },
    });
  }

  private async executeTool(toolName: string, args: McpToolInput): Promise<{ content: TextContent[] }> {
    let result: string;
    try {
      switch (toolName) {
        case 'list_connections':
          result = await this.handleListConnections(args);
          break;
        case 'get_connection_details':
          result = await this.handleGetConnectionDetails(args);
          break;
        case 'test_connection':
          result = await this.handleTestConnection(args);
          break;
        case 'create_connection':
          result = await this.handleCreateConnection(args);
          break;
        case 'get_schema':
          result = await this.handleGetSchema(args);
          break;
        case 'get_table_structure':
          result = await this.handleGetTableStructure(args);
          break;
        case 'get_table_indexes':
          result = await this.handleGetTableIndexes(args);
          break;
        case 'get_table_relationships':
          result = await this.handleGetTableRelationships(args);
          break;
        case 'create_table':
          result = await this.handleCreateTable(args);
          break;
        case 'add_column':
          result = await this.handleAddColumn(args);
          break;
        case 'drop_column':
          result = await this.handleDropColumn(args);
          break;
        case 'create_index':
          result = await this.handleCreateIndex(args);
          break;
        case 'execute_query':
          result = await this.handleExecuteQuery(args);
          break;
        case 'execute_query_with_params':
          result = await this.handleExecuteQueryWithParams(args);
          break;
        case 'insert_data':
          result = await this.handleInsertData(args);
          break;
        case 'update_data':
          result = await this.handleUpdateData(args);
          break;
        case 'delete_data':
          result = await this.handleDeleteData(args);
          break;
        case 'get_current_workspace':
          result = await this.handleGetCurrentWorkspace();
          break;
        case 'list_workspaces':
          result = await this.handleListWorkspaces();
          break;
        case 'switch_workspace':
          result = await this.handleSwitchWorkspace(args);
          break;
        case 'get_table_row_count':
          result = await this.handleGetTableRowCount(args);
          break;
        case 'get_table_stats':
          result = await this.handleGetTableStats(args);
          break;
        case 'analyze_query_performance':
          result = await this.handleAnalyzeQueryPerformance(args);
          break;
        case 'get_slow_queries':
          result = this.handleGetSlowQueries();
          break;
        default:
          result = JSON.stringify({ success: false, error: `Unknown tool: ${toolName}` });
      }
    } catch (error) {
      result = JSON.stringify({ success: false, error: this.formatError(error) });
    }

    return { content: [{ type: 'text', text: result }] };
  }

  private formatError(error: unknown): string {
    const asAny = error as { response?: { errors?: { message: string }[] } };
    const gqlErrors = asAny?.response?.errors;
    if (Array.isArray(gqlErrors) && gqlErrors.length > 0) {
      return gqlErrors.map((e) => e.message).join('; ');
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private async runOp(op: () => Promise<Record<string, unknown>>): Promise<string> {
    try {
      const data = await op();
      return JSON.stringify({ success: true, ...data });
    } catch (error) {
      return JSON.stringify({ success: false, error: this.formatError(error) });
    }
  }

  private async getConnectionEngine(connectionId: string): Promise<string> {
    const query = `query($id: ID!) { connection(id: $id) { engine } }`;
    const result = await this.graphqlClient.request<{ connection: { engine: string } }>(query, {
      id: connectionId,
    });
    return result.connection.engine;
  }

  private async runExecuteQuery(
    connectionId: string,
    sql: string,
    overrideLimits = false,
  ): Promise<unknown> {
    const mutation = `
      mutation($input: ExecuteQueryInput!) {
        executeQuery(input: $input) { columns rows rowCount executionTimeMs truncated }
      }
    `;
    const result = await this.graphqlClient.request<{ executeQuery: unknown }>(mutation, {
      input: { connectionId, sql, overrideLimits },
    });
    return result.executeQuery;
  }

  // ---- Connection tools ----

  private async handleListConnections(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `
        query($workspaceId: ID) {
          listConnections(workspaceId: $workspaceId) { ${CONNECTION_FIELDS} }
        }
      `;
      const result = await this.graphqlClient.request<{ listConnections: unknown[] }>(query, {
        workspaceId: args.workspace_id ?? null,
      });
      return { connections: result.listConnections };
    });
  }

  private async handleGetConnectionDetails(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `query($id: ID!) { connection(id: $id) { ${CONNECTION_FIELDS} } }`;
      const result = await this.graphqlClient.request<{ connection: unknown }>(query, {
        id: args.connection_id,
      });
      return { connection: result.connection };
    });
  }

  private async handleTestConnection(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const mutation = `
        mutation($id: ID!) { testSavedConnection(id: $id) { success message latencyMs } }
      `;
      const result = await this.graphqlClient.request<{ testSavedConnection: unknown }>(mutation, {
        id: args.connection_id,
      });
      return { result: result.testSavedConnection };
    });
  }

  private async handleCreateConnection(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const engineMap: Record<string, string> = {
        postgres: 'POSTGRES',
        postgresql: 'POSTGRES',
        mysql: 'MYSQL',
        mssql: 'MSSQL',
        sqlserver: 'MSSQL',
      };
      const engine = engineMap[String(args.type).toLowerCase()] || String(args.type).toUpperCase();
      const mutation = `
        mutation($input: CreateConnectionInput!) {
          createConnection(input: $input) { ${CONNECTION_FIELDS} }
        }
      `;
      const result = await this.graphqlClient.request<{ createConnection: unknown }>(mutation, {
        input: {
          workspaceId: args.workspace_id ?? null,
          name: args.name,
          engine,
          host: args.host,
          port: Number(args.port),
          database: args.database,
          username: args.username,
          password: args.password,
        },
      });
      return { connection: result.createConnection };
    });
  }

  // ---- Schema tools ----

  private async handleGetSchema(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      if (args.schema_name) {
        const query = `
          query($connectionId: ID!, $schema: String!) {
            schemaTables(connectionId: $connectionId, schema: $schema) { ${TABLE_DETAIL_FIELDS} }
          }
        `;
        const result = await this.graphqlClient.request<{ schemaTables: unknown[] }>(query, {
          connectionId: args.connection_id,
          schema: args.schema_name,
        });
        return { schema: { name: args.schema_name, tables: result.schemaTables } };
      }
      const query = `
        query($connectionId: ID!) {
          connectionSchemas(connectionId: $connectionId) {
            name
            tables { ${TABLE_DETAIL_FIELDS} }
          }
        }
      `;
      const result = await this.graphqlClient.request<{ connectionSchemas: unknown[] }>(query, {
        connectionId: args.connection_id,
      });
      return { schemas: result.connectionSchemas };
    });
  }

  private async handleGetTableStructure(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `
        query($connectionId: ID!, $schema: String!, $table: String!) {
          tableDetails(connectionId: $connectionId, schema: $schema, table: $table) { ${TABLE_DETAIL_FIELDS} }
        }
      `;
      const result = await this.graphqlClient.request<{ tableDetails: unknown }>(query, {
        connectionId: args.connection_id,
        schema: args.schema || 'public',
        table: args.table_name,
      });
      return { table: result.tableDetails };
    });
  }

  private async handleGetTableIndexes(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `
        query($connectionId: ID!, $schema: String!, $table: String!) {
          tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
            name
            indexes { name columns isUnique type }
          }
        }
      `;
      const result = await this.graphqlClient.request<{ tableDetails: { indexes: unknown[] } }>(
        query,
        { connectionId: args.connection_id, schema: args.schema || 'public', table: args.table_name },
      );
      return { indexes: result.tableDetails.indexes };
    });
  }

  private async handleGetTableRelationships(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `
        query($connectionId: ID!, $schema: String!, $table: String!) {
          tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
            name
            foreignKeys { name columns referencedTable referencedColumns onDelete onUpdate }
          }
        }
      `;
      const result = await this.graphqlClient.request<{ tableDetails: { foreignKeys: unknown[] } }>(
        query,
        { connectionId: args.connection_id, schema: args.schema || 'public', table: args.table_name },
      );
      return { foreignKeys: result.tableDetails.foreignKeys };
    });
  }

  private async handleCreateTable(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      let columns: Array<Record<string, unknown>> = [];
      if (args.columns) {
        try {
          columns = JSON.parse(String(args.columns));
        } catch {
          throw new Error('Invalid columns JSON format');
        }
      }
      const mutation = `
        mutation($input: CreateTableInput!) {
          createTable(input: $input) { id name schema nodes { tableName columns { name } } }
        }
      `;
      const result = await this.graphqlClient.request<{ createTable: unknown }>(mutation, {
        input: {
          connectionId: args.connection_id,
          schema: args.schema || 'public',
          tableName: args.table_name,
          primaryKeyColumn: args.primary_key_column || 'id',
          autoTimestamps: args.auto_timestamps ?? true,
          columns: columns.map((c) => ({
            name: c.name,
            nativeType: c.type ?? c.nativeType,
            nullable: c.nullable,
            defaultValue: c.default ?? c.defaultValue,
            isUnique: c.isUnique,
          })),
        },
      });
      return { diagram: result.createTable };
    });
  }

  private async handleAddColumn(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const mutation = `
        mutation($input: AddColumnInput!) {
          addColumn(input: $input) { id name schema nodes { tableName columns { name } } }
        }
      `;
      const result = await this.graphqlClient.request<{ addColumn: unknown }>(mutation, {
        input: {
          connectionId: args.connection_id,
          schema: args.schema || 'public',
          tableName: args.table_name,
          columnName: args.column_name,
          nativeType: args.column_type,
          nullable: args.nullable ?? true,
          defaultValue: args.default,
        },
      });
      return { diagram: result.addColumn };
    });
  }

  private async handleDropColumn(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const engine = await this.getConnectionEngine(String(args.connection_id));
      const schema = String(args.schema || 'public');
      const sql = `ALTER TABLE ${qualifiedTable(engine, schema, String(args.table_name))} DROP COLUMN ${quoteIdent(engine, String(args.column_name))};`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return { message: `Column '${args.column_name}' dropped from '${args.table_name}'`, sql, result };
    });
  }

  private async handleCreateIndex(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const engine = await this.getConnectionEngine(String(args.connection_id));
      const schema = String(args.schema || 'public');
      const cols = String(args.columns)
        .split(',')
        .map((c) => quoteIdent(engine, c.trim()))
        .join(', ');
      const unique = args.unique ? 'UNIQUE ' : '';
      const sql = `CREATE ${unique}INDEX ${quoteIdent(engine, String(args.index_name))} ON ${qualifiedTable(engine, schema, String(args.table_name))} (${cols});`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return { message: `Index '${args.index_name}' created on '${args.table_name}'`, sql, result };
    });
  }

  // ---- Query tools ----

  private async handleExecuteQuery(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const overrideLimits = typeof args.limit === 'number' && args.limit > 10000;
      const result = await this.runExecuteQuery(
        String(args.connection_id),
        String(args.query),
        overrideLimits,
      );
      return {
        data: result,
        note: 'Default server cap is 10,000 rows / 30s. Pass limit > 10000 next time to request the relaxed cap (up to 1,000,000 rows / 120s).',
      };
    });
  }

  private async handleExecuteQueryWithParams(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      let params: unknown[];
      try {
        params = JSON.parse(String(args.parameters));
      } catch {
        throw new Error('Invalid parameters JSON format (expected a JSON array)');
      }
      if (!Array.isArray(params)) {
        throw new Error('parameters must be a JSON array');
      }
      let sql = String(args.query);
      if (sql.includes('?')) {
        let i = 0;
        sql = sql.replace(/\?/g, () => quoteLiteral(params[i++]));
      } else {
        sql = sql.replace(/\$(\d+)/g, (_match, n: string) => quoteLiteral(params[Number(n) - 1]));
      }
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return {
        data: result,
        substitutedSql: sql,
        caveat:
          'Values were escaped and substituted client-side, not bound as true SQL parameters ' +
          '(the Workbench API has no parameterized-query support).',
      };
    });
  }

  private async handleInsertData(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(args.data));
      } catch {
        throw new Error('Invalid data JSON format');
      }
      const engine = await this.getConnectionEngine(String(args.connection_id));
      const schema = String(args.schema || 'public');
      const cols = Object.keys(data);
      if (cols.length === 0) throw new Error('data must have at least one column');
      const colSql = cols.map((c) => quoteIdent(engine, c)).join(', ');
      const valSql = cols.map((c) => quoteLiteral(data[c])).join(', ');
      const sql = `INSERT INTO ${qualifiedTable(engine, schema, String(args.table_name))} (${colSql}) VALUES (${valSql});`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return { message: `Row inserted into '${args.table_name}'`, sql, result };
    });
  }

  private async handleUpdateData(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(args.data));
      } catch {
        throw new Error('Invalid data JSON format');
      }
      const whereClause = String(args.where_clause || '').trim();
      if (!whereClause) {
        throw new Error('where_clause is required and cannot be empty (refusing an unconditional UPDATE)');
      }
      const engine = await this.getConnectionEngine(String(args.connection_id));
      const schema = String(args.schema || 'public');
      const setSql = Object.entries(data)
        .map(([c, v]) => `${quoteIdent(engine, c)} = ${quoteLiteral(v)}`)
        .join(', ');
      const sql = `UPDATE ${qualifiedTable(engine, schema, String(args.table_name))} SET ${setSql} WHERE ${whereClause};`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return { message: `Rows updated in '${args.table_name}'`, sql, result };
    });
  }

  private async handleDeleteData(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const whereClause = String(args.where_clause || '').trim();
      if (!whereClause) {
        throw new Error('where_clause is required and cannot be empty (refusing an unconditional DELETE)');
      }
      const engine = await this.getConnectionEngine(String(args.connection_id));
      const schema = String(args.schema || 'public');
      const sql = `DELETE FROM ${qualifiedTable(engine, schema, String(args.table_name))} WHERE ${whereClause};`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return { message: `Rows deleted from '${args.table_name}'`, sql, result };
    });
  }

  // ---- Workspace tools ----

  private async handleGetCurrentWorkspace(): Promise<string> {
    return this.runOp(async () => {
      const query = `query { listWorkspaces { id name slug currentUserRole createdAt } }`;
      const result = await this.graphqlClient.request<{ listWorkspaces: unknown[] }>(query);
      return {
        note: 'Workbench has no server-side "current workspace" session — pass workspace_id explicitly to list_connections.',
        workspaces: result.listWorkspaces,
      };
    });
  }

  private async handleListWorkspaces(): Promise<string> {
    return this.runOp(async () => {
      const query = `query { listWorkspaces { id name slug currentUserRole createdAt } }`;
      const result = await this.graphqlClient.request<{ listWorkspaces: unknown[] }>(query);
      return { workspaces: result.listWorkspaces };
    });
  }

  private async handleSwitchWorkspace(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `query($id: ID!) { getWorkspace(id: $id) { id name slug currentUserRole } }`;
      const result = await this.graphqlClient.request<{ getWorkspace: unknown }>(query, {
        id: args.workspace_id,
      });
      return {
        note: 'No server-side session was changed — pass this workspace_id explicitly going forward.',
        workspace: result.getWorkspace,
      };
    });
  }

  // ---- Inspection tools ----

  private async handleGetTableRowCount(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const query = `query($input: TableDataInput!) { tableData(input: $input) { totalCount } }`;
      const result = await this.graphqlClient.request<{ tableData: { totalCount: number } }>(query, {
        input: {
          connectionId: args.connection_id,
          schema: args.schema || 'public',
          table: args.table_name,
          limit: 1,
          offset: 0,
        },
      });
      return { rowCount: result.tableData.totalCount };
    });
  }

  private async handleGetTableStats(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const dataQuery = `query($input: TableDataInput!) { tableData(input: $input) { totalCount } }`;
      const detailQuery = `
        query($connectionId: ID!, $schema: String!, $table: String!) {
          tableDetails(connectionId: $connectionId, schema: $schema, table: $table) {
            columns { name }
            indexes { name }
            primaryKey
          }
        }
      `;
      const [dataRes, detailRes] = await Promise.all([
        this.graphqlClient.request<{ tableData: { totalCount: number } }>(dataQuery, {
          input: {
            connectionId: args.connection_id,
            schema: args.schema || 'public',
            table: args.table_name,
            limit: 1,
            offset: 0,
          },
        }),
        this.graphqlClient.request<{
          tableDetails: { columns: unknown[]; indexes: unknown[]; primaryKey: string[] };
        }>(detailQuery, {
          connectionId: args.connection_id,
          schema: args.schema || 'public',
          table: args.table_name,
        }),
      ]);
      return {
        stats: {
          rowCount: dataRes.tableData.totalCount,
          columnCount: detailRes.tableDetails.columns.length,
          indexCount: detailRes.tableDetails.indexes.length,
          primaryKey: detailRes.tableDetails.primaryKey,
        },
        note: 'Storage size on disk is not exposed by the Workbench API.',
      };
    });
  }

  private async handleAnalyzeQueryPerformance(args: McpToolInput): Promise<string> {
    return this.runOp(async () => {
      const engine = await this.getConnectionEngine(String(args.connection_id));
      if (engine === 'MSSQL') {
        throw new Error(
          'analyze_query_performance is not yet supported for MSSQL connections (SQL Server ' +
            "query-plan capture needs session state the shared connection pool can't safely isolate).",
        );
      }
      const sql = `EXPLAIN ${args.query}`;
      const result = await this.runExecuteQuery(String(args.connection_id), sql);
      return {
        engine,
        executionPlan: result,
        note: 'This is a plan estimate only (EXPLAIN, not EXPLAIN ANALYZE) — the query itself was not executed.',
      };
    });
  }

  private handleGetSlowQueries(): string {
    return JSON.stringify({
      success: false,
      error:
        'Not supported: the Workbench API does not expose database slow-query logs. ' +
        'Use analyze_query_performance on a specific query instead.',
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Workbench MCP Server started');
  }
}

const mcpServer = new WorkbenchMcpServer();
mcpServer.start().catch((err) => {
  console.error('Fatal error starting Workbench MCP Server:', err);
  process.exit(1);
});
