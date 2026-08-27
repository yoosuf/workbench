export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    sslMode?: 'disable' | 'require' | 'verify-ca';
  };
}

export type DataKind = 'STRING' | 'NUMERIC' | 'BOOLEAN' | 'DATETIME' | 'BINARY' | 'JSON' | 'UNKNOWN';

export interface ColumnMeta {
  name: string;
  nativeType: string;
  dataKind: DataKind;
  nullable: boolean;
  defaultValue: string | null;
  isAutoIncrement: boolean;
  ordinalPosition: number;
}

export interface TableMeta {
  name: string;
  kind: 'TABLE' | 'VIEW';
  schema: string;
}

export interface IndexMeta {
  name: string;
  columns: string[];
  isUnique: boolean;
  type: string;
}

export interface ForeignKeyMeta {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string | null;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
}

export interface TableDataOptions {
  limit?: number;
  offset?: number;
  sortColumn?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface TableDataResult extends QueryResult {
  totalCount: number;
  limit: number;
  offset: number;
  sortColumn?: string | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}

export interface ColumnDefinition {
  name: string;
  nativeType: string;
  nullable?: boolean;
  defaultValue?: string | null;
  isPrimaryKey?: boolean;
  isUnique?: boolean;
}

export interface CreateTableOptions {
  tableName: string;
  primaryKeyColumn?: string;
  primaryKeyType?: string;
  columns?: ColumnDefinition[];
  autoTimestamps?: boolean;
}

export interface AddColumnOptions {
  columnName: string;
  nativeType: string;
  nullable?: boolean;
  defaultValue?: string | null;
  isPrimaryKey?: boolean;
}

export interface AddForeignKeyOptions {
  constraintName?: string;
  sourceTable: string;
  sourceColumn: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface DatabaseUserMeta {
  username: string;
  isSuperuser?: boolean;
  host?: string;
}

export interface SchemaPermissionMeta {
  grantee: string;
  privilege: string;
  isGrantable?: boolean;
}

export interface GrantPermissionOptions {
  schema: string;
  username: string;
  privilege: string;
  grantAllTables?: boolean;
}

export interface RevokePermissionOptions {
  schema: string;
  username: string;
  privilege: string;
}

export interface DbDriver {
  testConnection(config: ConnectionConfig): Promise<boolean>;
  listSchemas(config: ConnectionConfig): Promise<string[]>;
  createSchema(config: ConnectionConfig, schemaName: string): Promise<boolean>;
  dropSchema(config: ConnectionConfig, schemaName: string, cascade?: boolean): Promise<boolean>;
  listDatabaseUsers(config: ConnectionConfig): Promise<DatabaseUserMeta[]>;
  getSchemaPermissions(config: ConnectionConfig, schemaName: string): Promise<SchemaPermissionMeta[]>;
  grantSchemaPermission(config: ConnectionConfig, options: GrantPermissionOptions): Promise<boolean>;
  revokeSchemaPermission(config: ConnectionConfig, options: RevokePermissionOptions): Promise<boolean>;
  listTables(config: ConnectionConfig, schema: string): Promise<TableMeta[]>;
  getColumns(config: ConnectionConfig, schema: string, table: string): Promise<ColumnMeta[]>;
  getPrimaryKey(config: ConnectionConfig, schema: string, table: string): Promise<string[]>;
  getForeignKeys(config: ConnectionConfig, schema: string, table: string): Promise<ForeignKeyMeta[]>;
  getIndexes(config: ConnectionConfig, schema: string, table: string): Promise<IndexMeta[]>;
  executeQuery(
    config: ConnectionConfig,
    sql: string,
    options: { timeoutMs: number; maxRows: number }
  ): Promise<QueryResult>;
  getTableData(
    config: ConnectionConfig,
    schema: string,
    table: string,
    options?: TableDataOptions
  ): Promise<TableDataResult>;
  createTable(
    config: ConnectionConfig,
    schema: string,
    options: CreateTableOptions
  ): Promise<boolean>;
  addColumn(
    config: ConnectionConfig,
    schema: string,
    table: string,
    options: AddColumnOptions
  ): Promise<boolean>;
  addForeignKey(
    config: ConnectionConfig,
    schema: string,
    options: AddForeignKeyOptions
  ): Promise<boolean>;
  dropTable(
    config: ConnectionConfig,
    schema: string,
    table: string
  ): Promise<boolean>;
}
