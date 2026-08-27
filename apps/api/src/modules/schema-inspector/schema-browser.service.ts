import { Injectable } from '@nestjs/common';
import { ConnectionsService } from '../connection-manager';
import {
  ColumnMeta,
  createDbDriver,
  ForeignKeyMeta,
  IndexMeta,
  TableMeta,
} from '@workbench/db-drivers';
import {
  DatabaseUser,
  SchemaInfo,
  SchemaPermission,
  TableDataResultGql,
  TableInfo,
} from './models/schema.model';
import {
  CreateSchemaInput,
  DropSchemaInput,
  GrantSchemaPermissionInput,
  RevokeSchemaPermissionInput,
  TableDataInput,
} from './dto/table-data.dto';

@Injectable()
export class SchemaBrowserService {
  constructor(private connectionsService: ConnectionsService) {}

  async listSchemas(userId: string, connectionId: string): Promise<SchemaInfo[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    const schemaNames = await driver.listSchemas(config);

    return schemaNames.map((name) => ({
      name,
      connectionId,
    }));
  }

  async createSchema(userId: string, input: CreateSchemaInput): Promise<SchemaInfo> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);
    await driver.createSchema(config, input.schemaName);

    return {
      name: input.schemaName,
      connectionId: input.connectionId,
    };
  }

  async dropSchema(userId: string, input: DropSchemaInput): Promise<boolean> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.dropSchema(config, input.schemaName, input.cascade);
  }

  async listDatabaseUsers(userId: string, connectionId: string): Promise<DatabaseUser[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.listDatabaseUsers(config);
  }

  async getSchemaPermissions(
    userId: string,
    connectionId: string,
    schema: string,
  ): Promise<SchemaPermission[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getSchemaPermissions(config, schema);
  }

  async grantSchemaPermission(
    userId: string,
    input: GrantSchemaPermissionInput,
  ): Promise<boolean> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.grantSchemaPermission(config, {
      schema: input.schemaName,
      username: input.username,
      privilege: input.privilege,
      grantAllTables: input.grantAllTables,
    });
  }

  async revokeSchemaPermission(
    userId: string,
    input: RevokeSchemaPermissionInput,
  ): Promise<boolean> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.revokeSchemaPermission(config, {
      schema: input.schemaName,
      username: input.username,
      privilege: input.privilege,
    });
  }

  async listTables(
    userId: string,
    connectionId: string,
    schema: string,
  ): Promise<TableInfo[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    const tables = await driver.listTables(config, schema);

    return tables.map((t) => ({
      name: t.name,
      kind: t.kind,
      schema: t.schema,
      connectionId,
    }));
  }

  async getTableColumns(
    userId: string,
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<ColumnMeta[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getColumns(config, schema, table);
  }

  async getPrimaryKey(
    userId: string,
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<string[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getPrimaryKey(config, schema, table);
  }

  async getForeignKeys(
    userId: string,
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<ForeignKeyMeta[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getForeignKeys(config, schema, table);
  }

  async getIndexes(
    userId: string,
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<IndexMeta[]> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getIndexes(config, schema, table);
  }

  async getTableData(
    userId: string,
    input: TableDataInput,
  ): Promise<TableDataResultGql> {
    const { engine, config } = await this.connectionsService.getDecryptedConfig(
      userId,
      input.connectionId,
    );
    const driver = createDbDriver(engine);
    return driver.getTableData(config, input.schema, input.table, {
      limit: input.limit,
      offset: input.offset,
      sortColumn: input.sortColumn,
      sortOrder: input.sortOrder,
    });
  }
}
