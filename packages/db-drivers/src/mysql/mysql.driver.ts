import mysql, { Connection } from 'mysql2/promise';
import {
  AddColumnOptions,
  AddForeignKeyOptions,
  ColumnMeta,
  ConnectionConfig,
  CreateTableOptions,
  DbDriver,
  ForeignKeyMeta,
  IndexMeta,
  QueryResult,
  TableDataOptions,
  TableDataResult,
  TableMeta,
  DataKind,
} from '../types';
import { DriverError } from '../errors';

export class MySqlDriver implements DbDriver {
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

  private resolveSsl(config: ConnectionConfig): any {
    if (!config.ssl) return undefined;
    if (typeof config.ssl === 'boolean') {
      return config.ssl ? { rejectUnauthorized: false } : undefined;
    }
    if (config.ssl.sslMode === 'disable') {
      return undefined;
    }
    return {
      rejectUnauthorized: config.ssl.rejectUnauthorized ?? false,
      ca: config.ssl.ca,
    };
  }

  private async getConnection(config: ConnectionConfig): Promise<Connection> {
    const ssl = this.resolveSsl(config);
    try {
      const conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl,
        connectTimeout: 10000,
        multipleStatements: true,
      });
      return conn;
    } catch (err: any) {
      throw new DriverError(
        err.code || 'MYSQL_CONNECTION_ERROR',
        `Failed to connect to MySQL: ${err.message}`,
        err,
      );
    }
  }

  private async safeEnd(conn: Connection): Promise<void> {
    try {
      await conn.end();
    } catch {
      // Ignore cleanup error
    }
  }

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    const conn = await this.getConnection(config);
    try {
      await conn.query('SELECT 1');
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_TEST_ERROR',
        `MySQL test connection failed: ${err.message}`,
        err,
      );
    }
  }

  async listSchemas(config: ConnectionConfig): Promise<string[]> {
    const conn = await this.getConnection(config);
    try {
      const [rows] = (await conn.query(`
        SELECT SCHEMA_NAME 
        FROM information_schema.SCHEMATA 
        WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        ORDER BY SCHEMA_NAME ASC;
      `)) as any;
      await this.safeEnd(conn);
      return rows.map((r: any) => r.SCHEMA_NAME);
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_LIST_SCHEMAS_ERROR',
        `Failed to list schemas: ${err.message}`,
        err,
      );
    }
  }

  async createSchema(config: ConnectionConfig, schemaName: string): Promise<boolean> {
    const validName = this.validateIdentifier(schemaName, 'schema name');
    const conn = await this.getConnection(config);
    try {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${validName}\``);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_CREATE_SCHEMA_ERROR',
        `Failed to create schema "${schemaName}": ${err.message}`,
        err,
      );
    }
  }

  async dropSchema(config: ConnectionConfig, schemaName: string): Promise<boolean> {
    const validName = this.validateIdentifier(schemaName, 'schema name');
    if (['mysql', 'information_schema', 'performance_schema', 'sys'].includes(validName.toLowerCase())) {
      throw new DriverError('PROHIBITED_OPERATION', `Cannot drop system schema "${validName}"`);
    }
    const conn = await this.getConnection(config);
    try {
      await conn.query(`DROP DATABASE IF EXISTS \`${validName}\``);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_DROP_SCHEMA_ERROR',
        `Failed to drop schema "${schemaName}": ${err.message}`,
        err,
      );
    }
  }

  async listDatabaseUsers(config: ConnectionConfig): Promise<any[]> {
    const conn = await this.getConnection(config);
    try {
      const [rows] = (await conn.query(
        `SELECT DISTINCT User AS username, Host AS host FROM mysql.user ORDER BY User ASC`,
      )) as any;
      await this.safeEnd(conn);
      return rows.map((r: any) => ({
        username: r.username,
        host: r.host,
        isSuperuser: false,
      }));
    } catch {
      await this.safeEnd(conn);
      return [{ username: config.username, host: '%', isSuperuser: true }];
    }
  }

  async getSchemaPermissions(config: ConnectionConfig, schemaName: string): Promise<any[]> {
    const validName = this.validateIdentifier(schemaName, 'schema');
    const conn = await this.getConnection(config);
    try {
      const [rows] = (await conn.query(
        `
        SELECT User AS grantee, Db AS schema_name, Select_priv, Insert_priv, Update_priv, Delete_priv, Create_priv, Drop_priv 
        FROM mysql.db 
        WHERE Db = ?
      `,
        [validName],
      )) as any;
      await this.safeEnd(conn);
      const permissions: any[] = [];
      for (const r of rows) {
        if (r.Select_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'SELECT' });
        if (r.Insert_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'INSERT' });
        if (r.Update_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'UPDATE' });
        if (r.Delete_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'DELETE' });
        if (r.Create_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'CREATE' });
        if (r.Drop_priv === 'Y') permissions.push({ grantee: r.grantee, privilege: 'DROP' });
      }
      return permissions;
    } catch {
      await this.safeEnd(conn);
      return [];
    }
  }

  async grantSchemaPermission(config: ConnectionConfig, options: any): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = options.privilege.toUpperCase();
    const conn = await this.getConnection(config);
    try {
      await conn.query(
        `GRANT ${privilege === 'USAGE' ? 'ALL PRIVILEGES' : privilege} ON \`${schema}\`.* TO '${username}'@'%'`,
      );
      await conn.query(`FLUSH PRIVILEGES`);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GRANT_ERROR',
        `Failed to grant permission: ${err.message}`,
        err,
      );
    }
  }

  async revokeSchemaPermission(config: ConnectionConfig, options: any): Promise<boolean> {
    const schema = this.validateIdentifier(options.schema, 'schema');
    const username = this.validateIdentifier(options.username, 'username');
    const privilege = options.privilege.toUpperCase();
    const conn = await this.getConnection(config);
    try {
      await conn.query(`REVOKE ${privilege} ON \`${schema}\`.* FROM '${username}'@'%'`);
      await conn.query(`FLUSH PRIVILEGES`);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_REVOKE_ERROR',
        `Failed to revoke permission: ${err.message}`,
        err,
      );
    }
  }

  async listTables(config: ConnectionConfig, schema: string): Promise<TableMeta[]> {
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    try {
      const [rows] = (await conn.query(
        `
        SELECT TABLE_NAME, TABLE_TYPE 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME ASC;
      `,
        [targetSchema],
      )) as any;
      await this.safeEnd(conn);

      return rows.map((r: any) => ({
        name: r.TABLE_NAME,
        kind: r.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'TABLE',
        schema: targetSchema,
      }));
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_LIST_TABLES_ERROR',
        `Failed to list tables for schema "${targetSchema}": ${err.message}`,
        err,
      );
    }
  }

  async getColumns(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<ColumnMeta[]> {
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    try {
      const [rows] = (await conn.query(
        `
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          EXTRA,
          ORDINAL_POSITION
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION ASC;
      `,
        [targetSchema, targetTable],
      )) as any;
      await this.safeEnd(conn);

      return rows.map((r: any) => {
        const isAutoInc = (r.EXTRA || '').toLowerCase().includes('auto_increment');
        return {
          name: r.COLUMN_NAME,
          nativeType: r.COLUMN_TYPE || r.DATA_TYPE,
          dataKind: this.mapDataKind(r.DATA_TYPE),
          nullable: r.IS_NULLABLE === 'YES',
          defaultValue: r.COLUMN_DEFAULT ?? null,
          isAutoIncrement: isAutoInc,
          ordinalPosition: r.ORDINAL_POSITION,
        };
      });
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GET_COLUMNS_ERROR',
        `Failed to get columns for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getPrimaryKey(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<string[]> {
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    try {
      const [rows] = (await conn.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE CONSTRAINT_NAME = 'PRIMARY'
          AND TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION ASC;
      `,
        [targetSchema, targetTable],
      )) as any;
      await this.safeEnd(conn);
      return rows.map((r: any) => r.COLUMN_NAME);
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GET_PK_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    try {
      const [rows] = (await conn.query(
        `
        SELECT
          kcu.CONSTRAINT_NAME,
          kcu.COLUMN_NAME,
          kcu.REFERENCED_TABLE_NAME,
          kcu.REFERENCED_COLUMN_NAME,
          rc.DELETE_RULE,
          rc.UPDATE_RULE
        FROM information_schema.KEY_COLUMN_USAGE AS kcu
        JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
          ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
          AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        WHERE kcu.REFERENCED_TABLE_NAME IS NOT NULL
          AND kcu.TABLE_SCHEMA = ?
          AND kcu.TABLE_NAME = ?
        ORDER BY kcu.ORDINAL_POSITION ASC;
      `,
        [targetSchema, targetTable],
      )) as any;
      await this.safeEnd(conn);

      const fkMap = new Map<string, ForeignKeyMeta>();
      for (const row of rows) {
        if (!fkMap.has(row.CONSTRAINT_NAME)) {
          fkMap.set(row.CONSTRAINT_NAME, {
            name: row.CONSTRAINT_NAME,
            columns: [row.COLUMN_NAME],
            referencedTable: row.REFERENCED_TABLE_NAME,
            referencedColumns: [row.REFERENCED_COLUMN_NAME],
            onDelete: row.DELETE_RULE,
            onUpdate: row.UPDATE_RULE || null,
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
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GET_FOREIGN_KEYS_ERROR',
        `Failed to get foreign keys for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async getIndexes(
    config: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<IndexMeta[]> {
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    try {
      const [rows] = (await conn.query(
        `
        SELECT
          INDEX_NAME,
          NON_UNIQUE,
          INDEX_TYPE,
          COLUMN_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY SEQ_IN_INDEX ASC;
      `,
        [targetSchema, targetTable],
      )) as any;
      await this.safeEnd(conn);

      const idxMap = new Map<string, IndexMeta>();
      for (const row of rows) {
        if (!idxMap.has(row.INDEX_NAME)) {
          idxMap.set(row.INDEX_NAME, {
            name: row.INDEX_NAME,
            isUnique: row.NON_UNIQUE === 0,
            type: row.INDEX_TYPE || 'BTREE',
            columns: [row.COLUMN_NAME],
          });
        } else {
          idxMap.get(row.INDEX_NAME)!.columns.push(row.COLUMN_NAME);
        }
      }

      return Array.from(idxMap.values());
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GET_INDEXES_ERROR',
        `Failed to get indexes for table "${targetSchema}.${table}": ${err.message}`,
        err,
      );
    }
  }

  async executeQuery(
    config: ConnectionConfig,
    sql: string,
    options: { timeoutMs: number; maxRows: number },
  ): Promise<QueryResult> {
    const conn = await this.getConnection(config);
    const start = Date.now();
    try {
      if (options.timeoutMs) {
        await conn.query(`SET SESSION max_execution_time = ${Number(options.timeoutMs)}`);
      }

      const [res, fields] = await conn.query(sql);
      const executionTimeMs = Date.now() - start;

      let columns: string[] = [];
      let rawRows: Record<string, unknown>[] = [];

      if (Array.isArray(fields) && fields.length > 0) {
        columns = fields.map((f: any) => f.name);
      }

      if (Array.isArray(res)) {
        rawRows = res as Record<string, unknown>[];
        if (columns.length === 0 && rawRows.length > 0 && rawRows[0]) {
          columns = Object.keys(rawRows[0]);
        }
      }

      const totalReturned = rawRows.length;
      const isTruncated = totalReturned > options.maxRows;
      const slicedRows = isTruncated ? rawRows.slice(0, options.maxRows) : rawRows;

      await this.safeEnd(conn);

      return {
        columns,
        rows: slicedRows,
        rowCount: totalReturned,
        executionTimeMs,
        truncated: isTruncated,
      };
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_QUERY_EXECUTION_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const safeSchema = `\`${targetSchema.replace(/`/g, '``')}\``;
    const safeTable = `\`${targetTable.replace(/`/g, '``')}\``;

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    try {
      // 1. Total count
      const [countRes] = (await conn.query(
        `SELECT COUNT(*) AS count FROM ${safeSchema}.${safeTable}`,
      )) as any;
      const totalCount = Number(countRes[0]?.count ?? 0);

      // 2. Page data
      let querySql = `SELECT * FROM ${safeSchema}.${safeTable}`;
      if (options?.sortColumn) {
        const safeSortCol = this.validateIdentifier(options.sortColumn, 'sortColumn');
        const safeSort = `\`${safeSortCol.replace(/`/g, '``')}\``;
        const sortDir = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
        querySql += ` ORDER BY ${safeSort} ${sortDir}`;
      }
      querySql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

      await this.safeEnd(conn);

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
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_GET_TABLE_DATA_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(options.tableName, 'tableName');
    const pkColumnName = this.validateIdentifier(options.primaryKeyColumn || 'id', 'primaryKeyColumn');

    const safeSchema = `\`${targetSchema.replace(/`/g, '``')}\``;
    const safeTable = `\`${targetTable.replace(/`/g, '``')}\``;
    const pkCol = `\`${pkColumnName.replace(/`/g, '``')}\``;

    const colDefs: string[] = [`${pkCol} INT AUTO_INCREMENT PRIMARY KEY`];

    // Additional user-defined columns
    if (options.columns && Array.isArray(options.columns)) {
      for (const col of options.columns) {
        if (!col.name || col.name === options.primaryKeyColumn) continue;
        const safeColName = `\`${this.validateIdentifier(col.name, 'columnName').replace(/`/g, '``')}\``;
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
      colDefs.push(`\`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`);
      colDefs.push(`\`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL`);
    }

    try {
      const sql = `CREATE TABLE IF NOT EXISTS ${safeSchema}.${safeTable} (\n  ${colDefs.join(',\n  ')}\n);`;
      await conn.query(sql);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_CREATE_TABLE_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const targetCol = this.validateIdentifier(options.columnName, 'columnName');

    const safeSchema = `\`${targetSchema.replace(/`/g, '``')}\``;
    const safeTable = `\`${targetTable.replace(/`/g, '``')}\``;
    const safeCol = `\`${targetCol.replace(/`/g, '``')}\``;

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

      await conn.query(sql);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_ADD_COLUMN_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const sourceTable = this.validateIdentifier(options.sourceTable, 'sourceTable');
    const sourceColumn = this.validateIdentifier(options.sourceColumn, 'sourceColumn');
    const referencedTable = this.validateIdentifier(options.referencedTable, 'referencedTable');
    const referencedColumn = this.validateIdentifier(options.referencedColumn, 'referencedColumn');

    const safeSchema = `\`${targetSchema.replace(/`/g, '``')}\``;
    const safeSourceTable = `\`${sourceTable.replace(/`/g, '``')}\``;
    const safeSourceCol = `\`${sourceColumn.replace(/`/g, '``')}\``;
    const safeTargetTable = `\`${referencedTable.replace(/`/g, '``')}\``;
    const safeTargetCol = `\`${referencedColumn.replace(/`/g, '``')}\``;
    
    const fkName = options.constraintName || `fk_${sourceTable}_${sourceColumn}_${Date.now().toString().slice(-4)}`;
    const safeFkName = `\`${this.validateIdentifier(fkName, 'constraintName').replace(/`/g, '``')}\``;
    const onDelete = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'].includes(options.onDelete?.toUpperCase() || '')
      ? options.onDelete!.toUpperCase()
      : 'CASCADE';

    try {
      const sql = `ALTER TABLE ${safeSchema}.${safeSourceTable} ADD CONSTRAINT ${safeFkName} FOREIGN KEY (${safeSourceCol}) REFERENCES ${safeSchema}.${safeTargetTable} (${safeTargetCol}) ON DELETE ${onDelete};`;
      await conn.query(sql);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_ADD_FK_ERROR',
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
    const conn = await this.getConnection(config);
    const targetSchema = this.validateIdentifier(schema || config.database, 'schema');
    const targetTable = this.validateIdentifier(table, 'table');
    const safeSchema = `\`${targetSchema.replace(/`/g, '``')}\``;
    const safeTable = `\`${targetTable.replace(/`/g, '``')}\``;

    try {
      const sql = `DROP TABLE IF EXISTS ${safeSchema}.${safeTable};`;
      await conn.query(sql);
      await this.safeEnd(conn);
      return true;
    } catch (err: any) {
      await this.safeEnd(conn);
      throw new DriverError(
        err.code || 'MYSQL_DROP_TABLE_ERROR',
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
        'mediumint',
        'bigint',
        'decimal',
        'numeric',
        'float',
        'double',
        'real',
      ].some((t) => type.includes(t))
    ) {
      return 'NUMERIC';
    }
    if (['char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext', 'enum', 'set'].some((t) =>
      type.includes(t),
    )) {
      return 'STRING';
    }
    if (type === 'boolean' || type === 'bool') {
      return 'BOOLEAN';
    }
    if (['date', 'datetime', 'timestamp', 'time', 'year'].some((t) => type.includes(t))) {
      return 'DATETIME';
    }
    if (type.includes('json')) {
      return 'JSON';
    }
    if (['blob', 'binary', 'varbinary', 'bit'].some((t) => type.includes(t))) {
      return 'BINARY';
    }
    return 'UNKNOWN';
  }
}
