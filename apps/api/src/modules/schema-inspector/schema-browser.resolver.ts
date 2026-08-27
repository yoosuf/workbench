import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { SchemaBrowserService } from './schema-browser.service';
import {
  ColumnInfo,
  DatabaseUser,
  ForeignKeyInfo,
  IndexInfo,
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
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';
import { TableMetadataLoaderService } from './dataloaders/table-metadata.loader';

@Resolver(() => SchemaInfo)
export class SchemaInfoResolver {
  constructor(private schemaBrowserService: SchemaBrowserService) {}

  @ResolveField(() => [TableInfo])
  async tables(
    @CurrentUser() user: User,
    @Parent() schemaInfo: SchemaInfo,
  ): Promise<TableInfo[]> {
    if (!schemaInfo.connectionId) return [];
    return this.schemaBrowserService.listTables(
      user.id,
      schemaInfo.connectionId,
      schemaInfo.name,
    );
  }
}

@Resolver(() => TableInfo)
export class TableInfoResolver {
  constructor(private tableLoader: TableMetadataLoaderService) {}

  @ResolveField(() => [ColumnInfo])
  async columns(
    @CurrentUser() user: User,
    @Parent() tableInfo: TableInfo,
    @Args('connectionId', { type: () => ID, nullable: true }) connectionId?: string,
  ): Promise<ColumnInfo[]> {
    const connId = connectionId || tableInfo.connectionId;
    if (!connId) return [];
    return this.tableLoader.columnsLoader.load({
      userId: user.id,
      connectionId: connId,
      schema: tableInfo.schema,
      table: tableInfo.name,
    });
  }

  @ResolveField(() => [String])
  async primaryKey(
    @CurrentUser() user: User,
    @Parent() tableInfo: TableInfo,
    @Args('connectionId', { type: () => ID, nullable: true }) connectionId?: string,
  ): Promise<string[]> {
    const connId = connectionId || tableInfo.connectionId;
    if (!connId) return [];
    return this.tableLoader.primaryKeyLoader.load({
      userId: user.id,
      connectionId: connId,
      schema: tableInfo.schema,
      table: tableInfo.name,
    });
  }

  @ResolveField(() => [ForeignKeyInfo])
  async foreignKeys(
    @CurrentUser() user: User,
    @Parent() tableInfo: TableInfo,
    @Args('connectionId', { type: () => ID, nullable: true }) connectionId?: string,
  ): Promise<ForeignKeyInfo[]> {
    const connId = connectionId || tableInfo.connectionId;
    if (!connId) return [];
    return this.tableLoader.foreignKeysLoader.load({
      userId: user.id,
      connectionId: connId,
      schema: tableInfo.schema,
      table: tableInfo.name,
    });
  }

  @ResolveField(() => [IndexInfo])
  async indexes(
    @CurrentUser() user: User,
    @Parent() tableInfo: TableInfo,
    @Args('connectionId', { type: () => ID, nullable: true }) connectionId?: string,
  ): Promise<IndexInfo[]> {
    const connId = connectionId || tableInfo.connectionId;
    if (!connId) return [];
    return this.tableLoader.indexesLoader.load({
      userId: user.id,
      connectionId: connId,
      schema: tableInfo.schema,
      table: tableInfo.name,
    });
  }
}

@Resolver()
export class SchemaBrowserResolver {
  constructor(private schemaBrowserService: SchemaBrowserService) {}

  @Query(() => [SchemaInfo])
  async connectionSchemas(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<SchemaInfo[]> {
    return this.schemaBrowserService.listSchemas(user.id, connectionId);
  }

  @Mutation(() => SchemaInfo)
  async createSchema(
    @CurrentUser() user: User,
    @Args('input') input: CreateSchemaInput,
  ): Promise<SchemaInfo> {
    return this.schemaBrowserService.createSchema(user.id, input);
  }

  @Mutation(() => Boolean)
  async dropSchema(
    @CurrentUser() user: User,
    @Args('input') input: DropSchemaInput,
  ): Promise<boolean> {
    return this.schemaBrowserService.dropSchema(user.id, input);
  }

  @Query(() => [DatabaseUser])
  async databaseUsers(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
  ): Promise<DatabaseUser[]> {
    return this.schemaBrowserService.listDatabaseUsers(user.id, connectionId);
  }

  @Query(() => [SchemaPermission])
  async schemaPermissions(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
    @Args('schema') schema: string,
  ): Promise<SchemaPermission[]> {
    return this.schemaBrowserService.getSchemaPermissions(user.id, connectionId, schema);
  }

  @Mutation(() => Boolean)
  async grantSchemaPermission(
    @CurrentUser() user: User,
    @Args('input') input: GrantSchemaPermissionInput,
  ): Promise<boolean> {
    return this.schemaBrowserService.grantSchemaPermission(user.id, input);
  }

  @Mutation(() => Boolean)
  async revokeSchemaPermission(
    @CurrentUser() user: User,
    @Args('input') input: RevokeSchemaPermissionInput,
  ): Promise<boolean> {
    return this.schemaBrowserService.revokeSchemaPermission(user.id, input);
  }

  @Query(() => [TableInfo])
  async schemaTables(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
    @Args('schema') schema: string,
  ): Promise<TableInfo[]> {
    return this.schemaBrowserService.listTables(user.id, connectionId, schema);
  }

  @Query(() => TableInfo)
  async tableDetails(
    @CurrentUser() user: User,
    @Args('connectionId', { type: () => ID }) connectionId: string,
    @Args('schema') schema: string,
    @Args('table') table: string,
  ): Promise<TableInfo> {
    return {
      name: table,
      schema,
      kind: 'TABLE',
      connectionId,
    };
  }

  @Query(() => TableDataResultGql)
  async tableData(
    @CurrentUser() user: User,
    @Args('input') input: TableDataInput,
  ): Promise<TableDataResultGql> {
    return this.schemaBrowserService.getTableData(user.id, input);
  }
}
