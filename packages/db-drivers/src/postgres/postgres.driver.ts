import { Pool, PoolClient } from 'pg';
import {
  AddColumnOptions,
  AddForeignKeyOptions,
  ColumnMeta,
  ConnectionConfig,
  CreateTableOptions,
  DatabaseUserMeta,
  DbDriver,
  ForeignKeyMeta,
  GrantPermissionOptions,
  IndexMeta,
  QueryResult,
  RevokePermissionOptions,
  SchemaPermissionMeta,
  TableDataOptions,
  TableDataResult,
  TableMeta,
  DataKind,
} from '../types';
import { DriverError } from '../errors';
import { PoolCache } from '../pool-cache';

const FATAL_CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'EPIPE',
  '28P01', // invalid_password
  '28000', // invalid_authorization_specification
  '57P01', // admin_shutdown
  '08006', // connection_failure
  '08003', // connection_does_not_exist
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
]);

function resolveSsl(config: ConnectionConfig): any {
  if (!config.ssl) return false;
  if (typeof config.ssl === 'boolean') {
    return config.ssl ? { rejectUnauthorized: false } : false;
  }
  if (config.ssl.sslMode === 'disable') {
    return false;
  }
  return {
    rejectUnauthorized: config.ssl.rejectUnauthorized ?? false,
    ca: config.ssl.ca,
  };
}

// Long-lived, shared across all PostgresDriver instances (the factory creates a fresh
// instance per call) so repeated operations against the same saved connection reuse one
// warm pool instead of paying a fresh TCP+auth handshake every time.
const pools = new PoolCache<Pool>({
  create: async (config) => {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: resolveSsl(config),
      statement_timeout: 30000,
      query_timeout: 30000,
      connectionTimeoutMillis: 10000,
      max: 5,
      idleTimeoutMillis: 30000,
    });
    // A pooled client can emit a background 'error' if it goes bad while idle (e.g. the
    // backend restarts). Without this listener that would crash the whole process.
    pool.on('error', () => {});
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      await pool.end().catch(() => {});
      throw err;
    }
    return pool;
  },
  destroy: async (pool) => {
    await pool.end();
  },
});

export class PostgresDriver implements DbDriver {
  private validateIdentifier(name: string, label: string): string {
    if (!name || typeof name !== 'string') {
      throw new DriverError('INVALID_IDENTIFIER', `Invalid ${label}: name cannot be empty`);
    }
    const sanitized = name.trim();
    if (!/^[a-zA-Z0-9_$.-]+$/.test(sanitized)) {
      throw new DriverError(
        'INVALID_IDENTIFIER',
        `Security Error: Invalid ${label} "${name}". Only alphanumeric, underscore, dot, and dash characters are allowed.`,
      );
    }
    return sanitized;
  }

  private async getPool(config: ConnectionConfig): Promise<Pool> {
    try {
      return await pools.get(config);
    } catch (err: any) {
      throw new DriverError(
        err.code || 'PG_CONNECTION_ERROR',
        `Failed to connect to PostgreSQL: ${err.message}`,
        err,
      );
    }
  }

  private async evictIfFatal(config: ConnectionConfig, err: any): Promise<void> {
    if (FATAL_CONNECTION_CODES.has(err?.code)) {
      await pools.evict(config);
    }
  }

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    // Ad-hoc check against possibly-unsaved credentials (e.g. the "Test Connection" button) —
    // deliberately not cached, so we don't pollute the pool cache with throwaway attempts.
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: resolveSsl(config),
      connectionTimeoutMillis: 10000,
      max: 1,
    });
    try {
      await pool.query('SELECT 1');
      await pool.end();
      return true;
    } catch (err: any) {
      await pool.end().catch(() => {});
      throw new DriverError(
        err.code || 'PG_TEST_ERROR',
        `PostgreSQL test connection failed: ${err.message}`,
        err,
      );
    }
  }

  async listSchemas(config: ConnectionConfig): Promise<string[]> {
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND schema_name NOT LIKE 'pg_temp_%'
          AND schema_name NOT LIKE 'pg_toast_temp_%'
        ORDER BY schema_name ASC;
      `);
      return res.rows.map((r) => r.schema_name);
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_LIST_SCHEMAS_ERROR',
        `Failed to list schemas: ${err.message}`,
        err,
      );
    }
  }

  async createSchema(config: ConnectionConfig, schemaName: string): Promise<boolean> {
    const validName = this.validateIdentifier(schemaName, 'schema name');
    const pool = await this.getPool(config);
    try {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${validName}"`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_CREATE_SCHEMA_ERROR',
        `Failed to create schema "${schemaName}": ${err.message}`,
        err,
      );
    }
  }

  async dropSchema(
    config: ConnectionConfig,
    schemaName: string,
    cascade: boolean = false,
  ): Promise<boolean> {
    const validName = this.validateIdentifier(schemaName, 'schema name');
    if (['public', 'pg_catalog', 'information_schema'].includes(validName.toLowerCase())) {
      throw new DriverError(
        'PROHIBITED_OPERATION',
        `Cannot drop system or default schema "${validName}"`,
      );
    }
    const pool = await this.getPool(config);
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${validName}" ${cascade ? 'CASCADE' : 'RESTRICT'}`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_DROP_SCHEMA_ERROR',
        `Failed to drop schema "${schemaName}": ${err.message}`,
        err,
      );
    }
  }

  async listDatabaseUsers(config: ConnectionConfig): Promise<DatabaseUserMeta[]> {
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(`
        SELECT usename AS username, usesuper AS is_superuser
        FROM pg_user
        ORDER BY usename ASC;
      `);
      return res.rows.map((r) => ({
        username: r.username,
        isSuperuser: !!r.is_superuser,
      }));
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_LIST_USERS_ERROR',
        `Failed to list database users: ${err.message}`,
        err,
      );
    }
  }

  async getSchemaPermissions(
    config: ConnectionConfig,
    schemaName: string,
  ): Promise<SchemaPermissionMeta[]> {
    const validName = this.validateIdentifier(schemaName, 'schema');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT grantee, privilege_type, is_grantable
        FROM information_schema.schema_privileges
        WHERE schema_name = $1
        ORDER BY grantee, privilege_type ASC;
      `,
        [validName],
      );
      return res.rows.map((r) => ({
        grantee: r.grantee,
        privilege: r.privilege_type,
        isGrantable: r.is_grantable === 'YES',
      }));
    } catch {
      return [];
    }
  }

  async grantSchemaPermission(
    config: ConnectionConfig,
    options: GrantPermissionOptions,
  ): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = options.privilege.toUpperCase();
    const allowed = ['ALL PRIVILEGES', 'USAGE', 'CREATE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    if (!allowed.includes(privilege)) {
      throw new DriverError('INVALID_PRIVILEGE', `Unsupported privilege: ${options.privilege}`);
    }
    const pool = await this.getPool(config);
    try {
      if (['USAGE', 'CREATE', 'ALL PRIVILEGES'].includes(privilege)) {
        await pool.query(`GRANT ${privilege} ON SCHEMA "${schema}" TO "${username}"`);
      }
      if (
        options.grantAllTables ||
        ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL PRIVILEGES'].includes(privilege)
      ) {
        const tablePriv = ['USAGE', 'CREATE'].includes(privilege) ? 'SELECT' : privilege;
        await pool.query(
          `GRANT ${tablePriv} ON ALL TABLES IN SCHEMA "${schema}" TO "${username}"`,
        );
        await pool.query(
          `ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT ${tablePriv} ON TABLES TO "${username}"`,
        );
      }
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GRANT_ERROR',
        `Failed to grant permission: ${err.message}`,
        err,
      );
    }
  }

  async revokeSchemaPermission(
    config: ConnectionConfig,
    options: RevokePermissionOptions,
  ): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = options.privilege.toUpperCase();
    const pool = await this.getPool(config);
    try {
      await pool.query(`REVOKE ${privilege} ON SCHEMA "${schema}" FROM "${username}"`);
      await pool.query(
        `REVOKE ${privilege} ON ALL TABLES IN SCHEMA "${schema}" FROM "${username}"`,
      );
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_REVOKE_ERROR',
        `Failed to revoke permission: ${err.message}`,
        err,
      );
    }
  }

  async listTables(config: ConnectionConfig, schema: string): Promise<TableMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name ASC;
      `,
        [targetSchema],
      );
      return res.rows.map((r) => ({
        name: r.table_name,
        kind: r.table_type === 'VIEW' ? 'VIEW' : 'TABLE',
        schema: targetSchema,
      }));
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_LIST_TABLES_ERROR',
        `Failed to list tables for schema "${schema}": ${err.message}`,
        err,
      );
    }
  }

  async getColumns(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<ColumnMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          ordinal_position,
          is_identity,
          identity_generation
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position ASC;
      `,
        [targetSchema, targetTable],
      );

      return res.rows.map((r) => {
        const isAutoInc =
          r.is_identity === 'YES' ||
          (r.column_default &&
            (r.column_default.includes('nextval(') ||
              r.column_default.includes('generated always')));

        return {
          name: r.column_name,
          nativeType: r.udt_name || r.data_type,
          dataKind: this.mapDataKind(r.data_type, r.udt_name),
          nullable: r.is_nullable === 'YES',
          defaultValue: r.column_default ?? null,
          isAutoIncrement: Boolean(isAutoInc),
          ordinalPosition: r.ordinal_position,
        };
      });
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GET_COLUMNS_ERROR',
        `Failed to get columns for table "${schema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getPrimaryKey(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<string[]> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY kcu.ordinal_position ASC;
      `,
        [targetSchema, targetTable],
      );
      return res.rows.map((r) => r.column_name);
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GET_PK_ERROR',
        `Failed to get primary key for table "${schema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getForeignKeys(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<ForeignKeyMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY kcu.ordinal_position ASC;
      `,
        [targetSchema, targetTable],
      );

      const fkMap = new Map<string, ForeignKeyMeta>();
      for (const row of res.rows) {
        if (!fkMap.has(row.constraint_name)) {
          fkMap.set(row.constraint_name, {
            name: row.constraint_name,
            columns: [row.column_name],
            referencedTable: row.referenced_table_name,
            referencedColumns: [row.referenced_column_name],
            onDelete: row.delete_rule,
            onUpdate: row.update_rule || null,
          });
        } else {
          const existing = fkMap.get(row.constraint_name)!;
          if (!existing.columns.includes(row.column_name)) {
            existing.columns.push(row.column_name);
          }
          if (!existing.referencedColumns.includes(row.referenced_column_name)) {
            existing.referencedColumns.push(row.referenced_column_name);
          }
        }
      }

      return Array.from(fkMap.values());
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GET_FOREIGN_KEYS_ERROR',
        `Failed to get foreign keys for table "${schema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getIndexes(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<IndexMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const res = await pool.query(
        `
        SELECT
          i.relname AS index_name,
          ix.indisunique AS is_unique,
          am.amname AS index_type,
          ARRAY_TO_STRING(ARRAY_AGG(a.attname ORDER BY array_position(ix.indkey, a.attnum)), ',') AS column_names
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE n.nspname = $1 AND t.relname = $2
        GROUP BY i.relname, ix.indisunique, am.amname;
      `,
        [targetSchema, targetTable],
      );

      return res.rows.map((r) => ({
        name: r.index_name,
        isUnique: Boolean(r.is_unique),
        type: (r.index_type || 'BTREE').toUpperCase(),
        columns: r.column_names ? r.column_names.split(',') : [],
      }));
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GET_INDEXES_ERROR',
        `Failed to get indexes for table "${schema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async executeQuery(
    config: ConnectionConfig,
    sql: string,
    options: { timeoutMs: number; maxRows: number },
  ): Promise<QueryResult> {
    const pool = await this.getPool(config);
    const start = Date.now();
    // statement_timeout is a per-connection session setting, so it and the query it guards
    // must run on the same checked-out client rather than two independent pool.query() calls.
    const client: PoolClient = await pool.connect();
    try {
      if (options.timeoutMs) {
        await client.query(`SET statement_timeout = ${Number(options.timeoutMs)}`);
      }

      const res = await client.query({
        text: sql,
        rowMode: 'array',
      });

      const executionTimeMs = Date.now() - start;
      const columns = res.fields ? res.fields.map((f) => f.name) : [];
      const totalReturned = res.rows.length;
      const isTruncated = totalReturned > options.maxRows;
      const slicedRows = isTruncated ? res.rows.slice(0, options.maxRows) : res.rows;

      const structuredRows: Record<string, unknown>[] = slicedRows.map((rowArr) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          obj[col] = rowArr[idx];
        });
        return obj;
      });

      return {
        columns,
        rows: structuredRows,
        rowCount: totalReturned,
        executionTimeMs,
        truncated: isTruncated,
      };
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_QUERY_EXECUTION_ERROR',
        `Query Execution Error: ${err.message}`,
        err,
      );
    } finally {
      client.release();
    }
  }

  async getTableData(
    config: ConnectionConfig,
    schema: string,
    table: string,
    options?: TableDataOptions,
  ): Promise<TableDataResult> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    const safeSchema = `"${targetSchema.replace(/"/g, '""')}"`;
    const safeTable = `"${targetTable.replace(/"/g, '""')}"`;

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    try {
      // 1. Get total count
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM ${safeSchema}.${safeTable}`,
      );
      const totalCount = countRes.rows[0]?.count ?? 0;

      // 2. Fetch page data
      let querySql = `SELECT * FROM ${safeSchema}.${safeTable}`;
      if (options?.sortColumn) {
        const safeSortCol = this.validateIdentifier(options.sortColumn, 'sortColumn');
        const safeSort = `"${safeSortCol.replace(/"/g, '""')}"`;
        const sortDir = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
        querySql += ` ORDER BY ${safeSort} ${sortDir}`;
      }
      querySql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

      const qResult = await this.executeQuery(config, querySql, {
        timeoutMs: 30000,
        maxRows: limit,
      });

      return {
        ...qResult,
        totalCount,
        limit,
        offset,
        sortColumn: options?.sortColumn ?? null,
        sortOrder: options?.sortOrder ?? null,
      };
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_GET_TABLE_DATA_ERROR',
        `Failed to browse table data for "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async createTable(
    config: ConnectionConfig,
    schema: string,
    options: CreateTableOptions,
  ): Promise<boolean> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(options.tableName, 'tableName');
    const pkColumnName = this.validateIdentifier(options.primaryKeyColumn || 'id', 'primaryKeyColumn');

    const pool = await this.getPool(config);
    const safeSchema = `"${targetSchema.replace(/"/g, '""')}"`;
    const safeTable = `"${targetTable.replace(/"/g, '""')}"`;
    const pkCol = `"${pkColumnName.replace(/"/g, '""')}"`;
    const pkType = options.primaryKeyType === 'UUID' ? 'UUID DEFAULT gen_random_uuid()' : 'SERIAL';

    const colDefs: string[] = [`${pkCol} ${pkType} PRIMARY KEY`];

    // Additional user-defined columns
    if (options.columns && Array.isArray(options.columns)) {
      for (const col of options.columns) {
        if (!col.name || col.name === options.primaryKeyColumn) continue;
        const safeColName = `"${this.validateIdentifier(col.name, 'columnName').replace(/"/g, '""')}"`;
        let colDef = `${safeColName} ${col.nativeType}`;
        if (col.nullable === false) {
          colDef += ' NOT NULL';
        }
        if (col.defaultValue !== undefined && col.defaultValue !== null && col.defaultValue !== '') {
          colDef += ` DEFAULT ${col.defaultValue}`;
        }
        if (col.isUnique) {
          colDef += ' UNIQUE';
        }
        colDefs.push(colDef);
      }
    }

    // Auto-generated created_at and updated_at timestamps
    if (options.autoTimestamps) {
      colDefs.push(`"created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`);
      colDefs.push(`"updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`);
    }

    try {
      const sql = `CREATE TABLE IF NOT EXISTS ${safeSchema}.${safeTable} (\n  ${colDefs.join(',\n  ')}\n);`;
      await pool.query(sql);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_CREATE_TABLE_ERROR',
        `Failed to create table "${targetSchema}.${options.tableName}": ${err.message}`,
        err,
      );
    }
  }

  async addColumn(
    config: ConnectionConfig,
    schema: string,
    table: string,
    options: AddColumnOptions,
  ): Promise<boolean> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const targetCol = this.validateIdentifier(options.columnName, 'columnName');

    const pool = await this.getPool(config);
    const safeSchema = `"${targetSchema.replace(/"/g, '""')}"`;
    const safeTable = `"${targetTable.replace(/"/g, '""')}"`;
    const safeCol = `"${targetCol.replace(/"/g, '""')}"`;

    try {
      let sql = `ALTER TABLE ${safeSchema}.${safeTable} ADD COLUMN ${safeCol} ${options.nativeType}`;
      if (options.nullable === false) {
        sql += ' NOT NULL';
      }
      if (options.defaultValue !== undefined && options.defaultValue !== null && options.defaultValue !== '') {
        sql += ` DEFAULT ${options.defaultValue}`;
      }
      if (options.isPrimaryKey) {
        sql += ' PRIMARY KEY';
      }
      sql += ';';

      await pool.query(sql);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_ADD_COLUMN_ERROR',
        `Failed to add column "${options.columnName}" to "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async addForeignKey(
    config: ConnectionConfig,
    schema: string,
    options: AddForeignKeyOptions,
  ): Promise<boolean> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const sourceTable = this.validateIdentifier(options.sourceTable, 'sourceTable');
    const sourceColumn = this.validateIdentifier(options.sourceColumn, 'sourceColumn');
    const referencedTable = this.validateIdentifier(options.referencedTable, 'referencedTable');
    const referencedColumn = this.validateIdentifier(options.referencedColumn, 'referencedColumn');

    const pool = await this.getPool(config);
    const safeSchema = `"${targetSchema.replace(/"/g, '""')}"`;
    const safeSourceTable = `"${sourceTable.replace(/"/g, '""')}"`;
    const safeSourceCol = `"${sourceColumn.replace(/"/g, '""')}"`;
    const safeTargetTable = `"${referencedTable.replace(/"/g, '""')}"`;
    const safeTargetCol = `"${referencedColumn.replace(/"/g, '""')}"`;

    const fkName = options.constraintName || `fk_${sourceTable}_${sourceColumn}_${Date.now().toString().slice(-4)}`;
    const safeFkName = `"${this.validateIdentifier(fkName, 'constraintName').replace(/"/g, '""')}"`;
    const onDelete = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'].includes(options.onDelete?.toUpperCase() || '')
      ? options.onDelete!.toUpperCase()
      : 'CASCADE';

    try {
      const sql = `ALTER TABLE ${safeSchema}.${safeSourceTable} ADD CONSTRAINT ${safeFkName} FOREIGN KEY (${safeSourceCol}) REFERENCES ${safeSchema}.${safeTargetTable} (${safeTargetCol}) ON DELETE ${onDelete};`;
      await pool.query(sql);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_ADD_FK_ERROR',
        `Failed to create foreign key relationship: ${err.message}`,
        err,
      );
    }
  }

  async dropTable(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<boolean> {
    const targetSchema = this.validateIdentifier(schema || 'public', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');

    const pool = await this.getPool(config);
    const safeSchema = `"${targetSchema.replace(/"/g, '""')}"`;
    const safeTable = `"${targetTable.replace(/"/g, '""')}"`;

    try {
      const sql = `DROP TABLE IF EXISTS ${safeSchema}.${safeTable} CASCADE;`;
      await pool.query(sql);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'PG_DROP_TABLE_ERROR',
        `Failed to drop table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  private mapDataKind(dataType: string, udtName: string): DataKind {
    const type = (udtName || dataType || '').toLowerCase();
    if (
      [
        'int2',
        'int4',
        'int8',
        'numeric',
        'decimal',
        'float4',
        'float8',
        'real',
        'double precision',
        'serial',
        'bigserial',
      ].some((t) => type.includes(t))
    ) {
      return 'NUMERIC';
    }
    if (['char', 'varchar', 'text', 'citext', 'bpchar'].some((t) => type.includes(t))) {
      return 'STRING';
    }
    if (['bool', 'boolean'].some((t) => type.includes(t))) {
      return 'BOOLEAN';
    }
    if (
      ['timestamp', 'timestamptz', 'date', 'time', 'timetz', 'interval'].some((t) =>
        type.includes(t),
      )
    ) {
      return 'DATETIME';
    }
    if (['json', 'jsonb'].some((t) => type.includes(t))) {
      return 'JSON';
    }
    if (['bytea', 'bit', 'varbit'].some((t) => type.includes(t))) {
      return 'BINARY';
    }
    return 'UNKNOWN';
  }
}

export async function closePostgresPools(): Promise<void> {
  await pools.closeAll();
}
