import { Injectable, Scope } from '@nestjs/common';
import * as DataLoaderImport from 'dataloader';
import { ConnectionsService } from '../../connection-manager';
import { createDbDriver } from '@workbench/db-drivers';
import { ColumnInfo, DataKindGql, ForeignKeyInfo, IndexInfo } from '../models/schema.model';

const DataLoader = (DataLoaderImport as any).default || DataLoaderImport;

export interface TableLookupKey {
  userId: string;
  connectionId: string;
  schema: string;
  table: string;
}

@Injectable({ scope: Scope.REQUEST })
export class TableMetadataLoaderService {
  constructor(private connectionsService: ConnectionsService) {}

  public readonly columnsLoader: import('dataloader')<TableLookupKey, ColumnInfo[], string> =
    new DataLoader(
      async (keys: readonly TableLookupKey[]) => {
        return Promise.all(
          keys.map(async (key) => {
            const { engine, config } = await this.connectionsService.getDecryptedConfig(
              key.userId,
              key.connectionId,
            );
            const driver = createDbDriver(engine);
            const rawCols = await driver.getColumns(config, key.schema, key.table);
            const pkCols = await driver.getPrimaryKey(config, key.schema, key.table);
            const fks = await driver.getForeignKeys(config, key.schema, key.table);
            const fkCols = new Set(fks.flatMap((fk) => fk.columns));

            return rawCols.map((col) => ({
              name: col.name,
              nativeType: col.nativeType,
              dataKind: (col.dataKind in DataKindGql ? col.dataKind : 'UNKNOWN') as DataKindGql,
              nullable: col.nullable,
              defaultValue: col.defaultValue,
              isAutoIncrement: col.isAutoIncrement,
              ordinalPosition: col.ordinalPosition,
              isPrimaryKey: pkCols.includes(col.name),
              isForeignKey: fkCols.has(col.name),
            }));
          }),
        );
      },
      { cacheKeyFn: (key: TableLookupKey) => `${key.connectionId}:${key.schema}:${key.table}` },
    );

  public readonly primaryKeyLoader: import('dataloader')<TableLookupKey, string[], string> =
    new DataLoader(
      async (keys: readonly TableLookupKey[]) => {
        return Promise.all(
          keys.map(async (key) => {
            const { engine, config } = await this.connectionsService.getDecryptedConfig(
              key.userId,
              key.connectionId,
            );
            const driver = createDbDriver(engine);
            return driver.getPrimaryKey(config, key.schema, key.table);
          }),
        );
      },
      { cacheKeyFn: (key: TableLookupKey) => `${key.connectionId}:${key.schema}:${key.table}` },
    );

  public readonly foreignKeysLoader: import('dataloader')<
    TableLookupKey,
    ForeignKeyInfo[],
    string
  > = new DataLoader(
    async (keys: readonly TableLookupKey[]) => {
      return Promise.all(
        keys.map(async (key) => {
          const { engine, config } = await this.connectionsService.getDecryptedConfig(
            key.userId,
            key.connectionId,
          );
          const driver = createDbDriver(engine);
          const fks = await driver.getForeignKeys(config, key.schema, key.table);
          return fks.map((fk) => ({
            name: fk.name,
            columns: fk.columns,
            referencedTable: fk.referencedTable,
            referencedColumns: fk.referencedColumns,
            onDelete: fk.onDelete,
            onUpdate: fk.onUpdate,
          }));
        }),
      );
    },
    { cacheKeyFn: (key: TableLookupKey) => `${key.connectionId}:${key.schema}:${key.table}` },
  );

  public readonly indexesLoader: import('dataloader')<TableLookupKey, IndexInfo[], string> =
    new DataLoader(
      async (keys: readonly TableLookupKey[]) => {
        return Promise.all(
          keys.map(async (key) => {
            const { engine, config } = await this.connectionsService.getDecryptedConfig(
              key.userId,
              key.connectionId,
            );
            const driver = createDbDriver(engine);
            const idxs = await driver.getIndexes(config, key.schema, key.table);
            return idxs.map((idx) => ({
              name: idx.name,
              columns: idx.columns,
              isUnique: idx.isUnique,
              type: idx.type,
            }));
          }),
        );
      },
      { cacheKeyFn: (key: TableLookupKey) => `${key.connectionId}:${key.schema}:${key.table}` },
    );
}
