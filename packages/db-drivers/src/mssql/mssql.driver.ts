import sql, { ConnectionPool } from 'mssql';
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

const SYSTEM_SCHEMAS = [
  'sys',
  'information_schema',
  'guest',
  'db_owner',
  'db_accessadmin',
  'db_securityadmin',
  'db_ddladmin',
  'db_backupoperator',
  'db_datareader',
  'db_datawriter',
  'db_denydatareader',
  'db_denydatawriter',
];

const ALLOWED_SCHEMA_PRIVILEGES = [
  'CONTROL',
  'VIEW DEFINITION',
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'EXECUTE',
  'ALTER',
  'REFERENCES',
];

const FATAL_CONNECTION_CODES = new Set([
  'ESOCKET',
  'ETIMEOUT',
  'ECONNCLOSED',
  'ELOGIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
]);

interface SchemaNameRow {
  schema_name: string;
}

interface TableNameRow {
  TABLE_NAME: string;
}

interface DatabaseUserRow {
  username: string;
  is_owner: number | null;
}

interface SchemaPermissionRow {
  grantee: string;
  privilege: string;
  state_desc: string;
}

interface TableRow {
  TABLE_NAME: string;
  TABLE_TYPE: string;
}

interface ColumnRow {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  NUMERIC_PRECISION: number | null;
  NUMERIC_SCALE: number | null;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  ORDINAL_POSITION: number;
  IS_IDENTITY: number | null;
}

interface PrimaryKeyRow {
  COLUMN_NAME: string;
}

interface ForeignKeyRow {
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  DELETE_RULE: string | null;
  UPDATE_RULE: string | null;
}

interface IndexRow {
  INDEX_NAME: string;
  IS_UNIQUE: boolean;
  INDEX_TYPE: string;
  COLUMN_NAME: string;
}

interface CountRow {
  count: number;
}

function resolveEncryption(config: ConnectionConfig): { encrypt: boolean; trustServerCertificate: boolean } {
  if (!config.ssl) {
    return { encrypt: false, trustServerCertificate: true };
  }
  if (typeof config.ssl === 'boolean') {
    return config.ssl
      ? { encrypt: true, trustServerCertificate: true }
      : { encrypt: false, trustServerCertificate: true };
  }
  if (config.ssl.sslMode === 'disable') {
    return { encrypt: false, trustServerCertificate: true };
  }
  return {
    encrypt: true,
    trustServerCertificate: !(config.ssl.rejectUnauthorized ?? false),
  };
}

// Long-lived, shared across all MssqlDriver instances (the factory creates a fresh instance
// per call) so repeated operations against the same saved connection reuse one warm pool
// instead of paying a fresh TCP+auth handshake every time.
const pools = new PoolCache<ConnectionPool>({
  create: async (config) => {
    const { encrypt, trustServerCertificate } = resolveEncryption(config);
    const pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionTimeout: 10000,
      requestTimeout: 30000,
      pool: { min: 0, max: 5, idleTimeoutMillis: 30000 },
      options: {
        encrypt,
        trustServerCertificate,
        enableArithAbort: true,
      },
    });
    // A pooled connection can emit a background 'error' if it goes bad while idle. Without
    // this listener that would crash the whole process.
    pool.on('error', () => {});
    await pool.connect();
    return pool;
  },
  destroy: async (pool) => {
    await pool.close();
  },
});

export class MssqlDriver implements DbDriver {
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

  private bracket(name: string): string {
    return `[${name.replace(/]/g, ']]')}]`;
  }

  private literal(name: string): string {
    return name.replace(/'/g, "''");
  }

  private mapPrivilege(privilege: string): string {
    const p = (privilege || '').toUpperCase();
    if (p === 'ALL PRIVILEGES') return 'CONTROL';
    if (p === 'USAGE') return 'VIEW DEFINITION';
    return p;
  }

  private async getPool(config: ConnectionConfig): Promise<ConnectionPool> {
    try {
      return await pools.get(config);
    } catch (err: any) {
      throw new DriverError(
        err.code || 'MSSQL_CONNECTION_ERROR',
        `Failed to connect to SQL Server: ${err.message}`,
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
    const { encrypt, trustServerCertificate } = resolveEncryption(config);
    const pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionTimeout: 10000,
      requestTimeout: 10000,
      pool: { min: 0, max: 1 },
      options: { encrypt, trustServerCertificate, enableArithAbort: true },
    });
    try {
      await pool.connect();
      await pool.request().query('SELECT 1');
      await pool.close();
      return true;
    } catch (err: any) {
      await pool.close().catch(() => {});
      throw new DriverError(
        err.code || 'MSSQL_TEST_ERROR',
        `SQL Server test connection failed: ${err.message}`,
        err,
      );
    }
  }

  async listSchemas(config: ConnectionConfig): Promise<string[]> {
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<SchemaNameRow>(`
        SELECT name AS schema_name
        FROM sys.schemas
        WHERE UPPER(name) NOT IN (${SYSTEM_SCHEMAS.map((s) => `'${s.toUpperCase()}'`).join(', ')})
        ORDER BY name ASC;
      `);
      return result.recordset.map((r) => r.schema_name);
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_LIST_SCHEMAS_ERROR',
        `Failed to list schemas: ${err.message}`,
        err,
      );
    }
  }

  async createSchema(config: ConnectionConfig, schemaName: string): Promise<boolean> {
    const validName = this.validateIdentifier(schemaName, 'schema name');
    const pool = await this.getPool(config);
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${this.literal(validName)}')
          EXEC('CREATE SCHEMA ${this.bracket(validName)}');
      `);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_CREATE_SCHEMA_ERROR',
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
    if (['dbo', 'sys', 'information_schema', 'guest'].includes(validName.toLowerCase())) {
      throw new DriverError(
        'PROHIBITED_OPERATION',
        `Cannot drop system or default schema "${validName}"`,
      );
    }
    const pool = await this.getPool(config);
    try {
      if (cascade) {
        // Drop FK constraints defined on tables in this schema first, so table drop order
        // doesn't matter (SQL Server has no schema-level DROP ... CASCADE like Postgres).
        await pool.request().query(`
          DECLARE @dropFks NVARCHAR(MAX) = N'';
          SELECT @dropFks += 'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + '.' + QUOTENAME(t.name)
                            + ' DROP CONSTRAINT ' + QUOTENAME(fk.name) + ';' + CHAR(10)
          FROM sys.foreign_keys fk
          JOIN sys.tables t ON fk.parent_object_id = t.object_id
          WHERE t.schema_id = SCHEMA_ID('${this.literal(validName)}');
          IF LEN(@dropFks) > 0 EXEC sp_executesql @dropFks;
        `);

        const tables = await pool
          .request()
          .query<TableNameRow>(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${this.literal(validName)}';`,
          );
        for (const row of tables.recordset) {
          await pool
            .request()
            .query(`DROP TABLE IF EXISTS ${this.bracket(validName)}.${this.bracket(row.TABLE_NAME)};`);
        }
      }
      await pool.request().query(`DROP SCHEMA IF EXISTS ${this.bracket(validName)};`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_DROP_SCHEMA_ERROR',
        `Failed to drop schema "${schemaName}": ${err.message}`,
        err,
      );
    }
  }

  async listDatabaseUsers(config: ConnectionConfig): Promise<DatabaseUserMeta[]> {
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<DatabaseUserRow>(`
        SELECT name AS username, IS_ROLEMEMBER('db_owner', name) AS is_owner
        FROM sys.database_principals
        WHERE type IN ('S', 'U')
          AND name NOT LIKE '##%'
          AND UPPER(name) NOT IN ('DBO', 'GUEST', 'INFORMATION_SCHEMA', 'SYS')
        ORDER BY name ASC;
      `);
      return result.recordset.map((r) => ({
        username: r.username,
        isSuperuser: r.is_owner === 1,
      }));
    } catch {
      return [{ username: config.username, isSuperuser: true }];
    }
  }

  async getSchemaPermissions(config: ConnectionConfig, schemaName: string): Promise<SchemaPermissionMeta[]> {
    const validName = this.validateIdentifier(schemaName, 'schema');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<SchemaPermissionRow>(`
        SELECT dp.name AS grantee, perm.permission_name AS privilege, perm.state_desc AS state_desc
        FROM sys.database_permissions perm
        JOIN sys.database_principals dp ON perm.grantee_principal_id = dp.principal_id
        JOIN sys.schemas s ON perm.major_id = s.schema_id AND perm.class = 3
        WHERE s.name = '${this.literal(validName)}'
        ORDER BY dp.name ASC, perm.permission_name ASC;
      `);
      return result.recordset.map((r) => ({
        grantee: r.grantee,
        privilege: r.privilege,
        isGrantable: r.state_desc === 'GRANT_WITH_GRANT_OPTION',
      }));
    } catch {
      return [];
    }
  }

  async grantSchemaPermission(config: ConnectionConfig, options: GrantPermissionOptions): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = this.mapPrivilege(options.privilege);
    if (!ALLOWED_SCHEMA_PRIVILEGES.includes(privilege)) {
      throw new DriverError('INVALID_PRIVILEGE', `Unsupported privilege: ${options.privilege}`);
    }
    const pool = await this.getPool(config);
    try {
      await pool
        .request()
        .query(`GRANT ${privilege} ON SCHEMA::${this.bracket(schema)} TO ${this.bracket(username)};`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_GRANT_ERROR',
        `Failed to grant permission: ${err.message}`,
        err,
      );
    }
  }

  async revokeSchemaPermission(config: ConnectionConfig, options: RevokePermissionOptions): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = this.mapPrivilege(options.privilege);
    const pool = await this.getPool(config);
    try {
      await pool
        .request()
        .query(`REVOKE ${privilege} ON SCHEMA::${this.bracket(schema)} FROM ${this.bracket(username)};`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_REVOKE_ERROR',
        `Failed to revoke permission: ${err.message}`,
        err,
      );
    }
  }

  async listTables(config: ConnectionConfig, schema: string): Promise<TableMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<TableRow>(`
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${this.literal(targetSchema)}'
        ORDER BY TABLE_NAME ASC;
      `);
      return result.recordset.map((r) => ({
        name: r.TABLE_NAME,
        kind: r.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'TABLE',
        schema: targetSchema,
      }));
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_LIST_TABLES_ERROR',
        `Failed to list tables for schema "${targetSchema}": ${err.message}`,
        err,
      );
    }
  }

  async getColumns(config: ConnectionConfig, schema: string, table: string): Promise<ColumnMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<ColumnRow>(`
        SELECT
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.CHARACTER_MAXIMUM_LENGTH,
          c.NUMERIC_PRECISION,
          c.NUMERIC_SCALE,
          c.IS_NULLABLE,
          c.COLUMN_DEFAULT,
          c.ORDINAL_POSITION,
          COLUMNPROPERTY(OBJECT_ID('${this.literal(targetSchema)}.${this.literal(targetTable)}'), c.COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY
        FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_SCHEMA = '${this.literal(targetSchema)}' AND c.TABLE_NAME = '${this.literal(targetTable)}'
        ORDER BY c.ORDINAL_POSITION ASC;
      `);

      return result.recordset.map((r) => {
        let nativeType = r.DATA_TYPE;
        if (r.CHARACTER_MAXIMUM_LENGTH != null) {
          nativeType += `(${r.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : r.CHARACTER_MAXIMUM_LENGTH})`;
        } else if (r.NUMERIC_PRECISION != null && r.NUMERIC_SCALE != null && /decimal|numeric/i.test(r.DATA_TYPE)) {
          nativeType += `(${r.NUMERIC_PRECISION},${r.NUMERIC_SCALE})`;
        }
        return {
          name: r.COLUMN_NAME,
          nativeType,
          dataKind: this.mapDataKind(r.DATA_TYPE),
          nullable: r.IS_NULLABLE === 'YES',
          defaultValue: r.COLUMN_DEFAULT ?? null,
          isAutoIncrement: r.IS_IDENTITY === 1,
          ordinalPosition: r.ORDINAL_POSITION,
        };
      });
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_GET_COLUMNS_ERROR',
        `Failed to get columns for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getPrimaryKey(config: ConnectionConfig, schema: string, table: string): Promise<string[]> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<PrimaryKeyRow>(`
        SELECT kcu.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          AND tc.TABLE_SCHEMA = '${this.literal(targetSchema)}'
          AND tc.TABLE_NAME = '${this.literal(targetTable)}'
        ORDER BY kcu.ORDINAL_POSITION ASC;
      `);
      return result.recordset.map((r) => r.COLUMN_NAME);
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_GET_PK_ERROR',
        `Failed to get primary key for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getForeignKeys(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<ForeignKeyMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<ForeignKeyRow>(`
        SELECT
          fk.name AS CONSTRAINT_NAME,
          cpa.name AS COLUMN_NAME,
          tr.name AS REFERENCED_TABLE_NAME,
          cref.name AS REFERENCED_COLUMN_NAME,
          fk.delete_referential_action_desc AS DELETE_RULE,
          fk.update_referential_action_desc AS UPDATE_RULE
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN sys.tables t ON fk.parent_object_id = t.object_id
        JOIN sys.schemas sch ON t.schema_id = sch.schema_id
        JOIN sys.columns cpa ON fkc.parent_object_id = cpa.object_id AND fkc.parent_column_id = cpa.column_id
        JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
        JOIN sys.columns cref ON fkc.referenced_object_id = cref.object_id AND fkc.referenced_column_id = cref.column_id
        WHERE sch.name = '${this.literal(targetSchema)}' AND t.name = '${this.literal(targetTable)}'
        ORDER BY fkc.constraint_column_id ASC;
      `);

      const fkMap = new Map<string, ForeignKeyMeta>();
      for (const row of result.recordset) {
        const ruleText = (v: string | null) => (v || 'NO_ACTION').replace(/_/g, ' ');
        if (!fkMap.has(row.CONSTRAINT_NAME)) {
          fkMap.set(row.CONSTRAINT_NAME, {
            name: row.CONSTRAINT_NAME,
            columns: [row.COLUMN_NAME],
            referencedTable: row.REFERENCED_TABLE_NAME,
            referencedColumns: [row.REFERENCED_COLUMN_NAME],
            onDelete: ruleText(row.DELETE_RULE),
            onUpdate: ruleText(row.UPDATE_RULE),
          });
        } else {
          const existing = fkMap.get(row.CONSTRAINT_NAME)!;
          if (!existing.columns.includes(row.COLUMN_NAME)) {
            existing.columns.push(row.COLUMN_NAME);
          }
          if (!existing.referencedColumns.includes(row.REFERENCED_COLUMN_NAME)) {
            existing.referencedColumns.push(row.REFERENCED_COLUMN_NAME);
          }
        }
      }

      return Array.from(fkMap.values());
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_GET_FOREIGN_KEYS_ERROR',
        `Failed to get foreign keys for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getIndexes(config: ConnectionConfig, schema: string, table: string): Promise<IndexMeta[]> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const pool = await this.getPool(config);
    try {
      const result = await pool.request().query<IndexRow>(`
        SELECT i.name AS INDEX_NAME, i.is_unique AS IS_UNIQUE, i.type_desc AS INDEX_TYPE, c.name AS COLUMN_NAME
        FROM sys.indexes i
        JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        JOIN sys.tables t ON i.object_id = t.object_id
        JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = '${this.literal(targetSchema)}' AND t.name = '${this.literal(targetTable)}' AND i.name IS NOT NULL
        ORDER BY i.name ASC, ic.key_ordinal ASC;
      `);

      const idxMap = new Map<string, IndexMeta>();
      for (const row of result.recordset) {
        if (!idxMap.has(row.INDEX_NAME)) {
          idxMap.set(row.INDEX_NAME, {
            name: row.INDEX_NAME,
            isUnique: Boolean(row.IS_UNIQUE),
            type: row.INDEX_TYPE || 'NONCLUSTERED',
            columns: [row.COLUMN_NAME],
          });
        } else {
          idxMap.get(row.INDEX_NAME)!.columns.push(row.COLUMN_NAME);
        }
      }

      return Array.from(idxMap.values());
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_GET_INDEXES_ERROR',
        `Failed to get indexes for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  /**
   * mssql only supports requestTimeout as a pool-wide connection setting, not per-request —
   * so with a shared, long-lived pool a per-call override can't be applied by reconnecting.
   * Instead race the request against a timer that calls request.cancel() client-side.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, cancel: () => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        cancel();
        reject(new Error(`Query timed out after ${ms}ms`));
      }, ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  async executeQuery(
    config: ConnectionConfig,
    sqlText: string,
    options: { timeoutMs: number; maxRows: number },
  ): Promise<QueryResult> {
    const pool = await this.getPool(config);
    const start = Date.now();
    try {
      const request = pool.request();
      const queryPromise = request.query(sqlText);
      const result = options.timeoutMs
        ? await this.withTimeout(queryPromise, options.timeoutMs, () => request.cancel())
        : await queryPromise;
      const executionTimeMs = Date.now() - start;

      const rawRows = (result.recordset || []) as Record<string, unknown>[];
      const columns = result.recordset ? Object.keys(result.recordset.columns || {}) : [];
      const finalColumns = columns.length > 0 ? columns : rawRows[0] ? Object.keys(rawRows[0]) : [];

      const totalReturned = rawRows.length;
      const isTruncated = totalReturned > options.maxRows;
      const slicedRows = isTruncated ? rawRows.slice(0, options.maxRows) : rawRows;

      return {
        columns: finalColumns,
        rows: slicedRows,
        rowCount: totalReturned,
        executionTimeMs,
        truncated: isTruncated,
      };
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_QUERY_EXECUTION_ERROR',
        `Query Execution Error: ${err.message}`,
        err,
      );
    }
  }

  async getTableData(
    config: ConnectionConfig,
    schema: string,
    table: string,
    options?: TableDataOptions,
  ): Promise<TableDataResult> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const safeSchema = this.bracket(targetSchema);
    const safeTable = this.bracket(targetTable);
    const pool = await this.getPool(config);

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    try {
      const countRes = await pool
        .request()
        .query<CountRow>(`SELECT COUNT(*) AS count FROM ${safeSchema}.${safeTable};`);
      const totalCount = Number(countRes.recordset[0]?.count ?? 0);

      let orderBy = '(SELECT NULL)';
      if (options?.sortColumn) {
        const safeSortCol = this.validateIdentifier(options.sortColumn, 'sortColumn');
        const sortDir = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
        orderBy = `${this.bracket(safeSortCol)} ${sortDir}`;
      }

      const querySql = `SELECT * FROM ${safeSchema}.${safeTable} ORDER BY ${orderBy} OFFSET ${Number(offset)} ROWS FETCH NEXT ${Number(limit)} ROWS ONLY;`;

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
        err.code || 'MSSQL_GET_TABLE_DATA_ERROR',
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
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(options.tableName, 'tableName');
    const pkColumnName = this.validateIdentifier(options.primaryKeyColumn || 'id', 'primaryKeyColumn');

    const safeSchema = this.bracket(targetSchema);
    const safeTable = this.bracket(targetTable);
    const pkCol = this.bracket(pkColumnName);

    const colDefs: string[] = [`${pkCol} INT IDENTITY(1,1) PRIMARY KEY`];

    if (options.columns && Array.isArray(options.columns)) {
      for (const col of options.columns) {
        if (!col.name || col.name === options.primaryKeyColumn) continue;
        const safeColName = this.bracket(this.validateIdentifier(col.name, 'columnName'));
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

    if (options.autoTimestamps) {
      colDefs.push(`${this.bracket('created_at')} DATETIME2 DEFAULT SYSUTCDATETIME() NOT NULL`);
      colDefs.push(`${this.bracket('updated_at')} DATETIME2 DEFAULT SYSUTCDATETIME() NOT NULL`);
    }

    const pool = await this.getPool(config);
    try {
      const sqlText = `
        IF OBJECT_ID('${this.literal(targetSchema)}.${this.literal(targetTable)}', 'U') IS NULL
        BEGIN
          CREATE TABLE ${safeSchema}.${safeTable} (\n  ${colDefs.join(',\n  ')}\n);
        END
      `;
      await pool.request().query(sqlText);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_CREATE_TABLE_ERROR',
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
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const targetCol = this.validateIdentifier(options.columnName, 'columnName');

    const safeSchema = this.bracket(targetSchema);
    const safeTable = this.bracket(targetTable);
    const safeCol = this.bracket(targetCol);

    const pool = await this.getPool(config);
    try {
      let sqlText = `ALTER TABLE ${safeSchema}.${safeTable} ADD ${safeCol} ${options.nativeType}`;
      if (options.nullable === false) {
        sqlText += ' NOT NULL';
      }
      if (options.defaultValue !== undefined && options.defaultValue !== null && options.defaultValue !== '') {
        sqlText += ` DEFAULT ${options.defaultValue}`;
      }
      if (options.isPrimaryKey) {
        sqlText += ' PRIMARY KEY';
      }
      sqlText += ';';

      await pool.request().query(sqlText);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_ADD_COLUMN_ERROR',
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
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const sourceTable = this.validateIdentifier(options.sourceTable, 'sourceTable');
    const sourceColumn = this.validateIdentifier(options.sourceColumn, 'sourceColumn');
    const referencedTable = this.validateIdentifier(options.referencedTable, 'referencedTable');
    const referencedColumn = this.validateIdentifier(options.referencedColumn, 'referencedColumn');

    const safeSchema = this.bracket(targetSchema);
    const safeSourceTable = this.bracket(sourceTable);
    const safeSourceCol = this.bracket(sourceColumn);
    const safeTargetTable = this.bracket(referencedTable);
    const safeTargetCol = this.bracket(referencedColumn);

    const fkName = options.constraintName || `fk_${sourceTable}_${sourceColumn}_${Date.now().toString().slice(-4)}`;
    const safeFkName = this.bracket(this.validateIdentifier(fkName, 'constraintName'));
    const requestedOnDelete = options.onDelete?.toUpperCase() || '';
    const onDelete = ['CASCADE', 'SET NULL', 'NO ACTION'].includes(requestedOnDelete)
      ? requestedOnDelete
      : requestedOnDelete === 'RESTRICT'
        ? 'NO ACTION'
        : 'CASCADE';

    const pool = await this.getPool(config);
    try {
      const sqlText = `ALTER TABLE ${safeSchema}.${safeSourceTable} ADD CONSTRAINT ${safeFkName} FOREIGN KEY (${safeSourceCol}) REFERENCES ${safeSchema}.${safeTargetTable} (${safeTargetCol}) ON DELETE ${onDelete};`;
      await pool.request().query(sqlText);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_ADD_FK_ERROR',
        `Failed to create foreign key relationship: ${err.message}`,
        err,
      );
    }
  }

  async dropTable(config: ConnectionConfig, schema: string, table: string): Promise<boolean> {
    const targetSchema = this.validateIdentifier(schema || 'dbo', 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const safeSchema = this.bracket(targetSchema);
    const safeTable = this.bracket(targetTable);

    const pool = await this.getPool(config);
    try {
      await pool.request().query(`DROP TABLE IF EXISTS ${safeSchema}.${safeTable};`);
      return true;
    } catch (err: any) {
      await this.evictIfFatal(config, err);
      throw new DriverError(
        err.code || 'MSSQL_DROP_TABLE_ERROR',
        `Failed to drop table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  private mapDataKind(dataType: string): DataKind {
    const type = (dataType || '').toLowerCase();
    if (
      [
        'int',
        'tinyint',
        'smallint',
        'bigint',
        'decimal',
        'numeric',
        'float',
        'real',
        'money',
        'smallmoney',
      ].some((t) => type === t)
    ) {
      return 'NUMERIC';
    }
    if (
      ['char', 'varchar', 'nchar', 'nvarchar', 'text', 'ntext', 'xml', 'uniqueidentifier'].some(
        (t) => type === t,
      )
    ) {
      return 'STRING';
    }
    if (type === 'bit') {
      return 'BOOLEAN';
    }
    if (
      ['date', 'datetime', 'datetime2', 'smalldatetime', 'time', 'datetimeoffset'].some(
        (t) => type === t,
      )
    ) {
      return 'DATETIME';
    }
    if (['binary', 'varbinary', 'image', 'timestamp', 'rowversion'].some((t) => type === t)) {
      return 'BINARY';
    }
    return 'UNKNOWN';
  }
}

export async function closeMssqlPools(): Promise<void> {
  await pools.closeAll();
}
