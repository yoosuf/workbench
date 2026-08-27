import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export enum DataKindGql {
  STRING = 'STRING',
  NUMERIC = 'NUMERIC',
  BOOLEAN = 'BOOLEAN',
  DATETIME = 'DATETIME',
  BINARY = 'BINARY',
  JSON = 'JSON',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(DataKindGql, {
  name: 'DataKind',
  description: 'Generic standardized data type category',
});

@ObjectType()
export class ColumnInfo {
  @Field(() => String)
  name: string;

  @Field(() => String)
  nativeType: string;

  @Field(() => DataKindGql)
  dataKind: DataKindGql;

  @Field(() => Boolean)
  nullable: boolean;

  @Field(() => String, { nullable: true })
  defaultValue: string | null;

  @Field(() => Boolean)
  isAutoIncrement: boolean;

  @Field(() => Int)
  ordinalPosition: number;

  @Field(() => Boolean)
  isPrimaryKey: boolean;

  @Field(() => Boolean)
  isForeignKey: boolean;
}

@ObjectType()
export class IndexInfo {
  @Field(() => String)
  name: string;

  @Field(() => [String])
  columns: string[];

  @Field(() => Boolean)
  isUnique: boolean;

  @Field(() => String)
  type: string;
}

@ObjectType()
export class ForeignKeyInfo {
  @Field(() => String)
  name: string;

  @Field(() => [String])
  columns: string[];

  @Field(() => String)
  referencedTable: string;

  @Field(() => [String])
  referencedColumns: string[];

  @Field(() => String)
  onDelete: string;

  @Field(() => String, { nullable: true })
  onUpdate: string | null;
}

@ObjectType()
export class TableInfo {
  @Field(() => String)
  name: string;

  @Field(() => String)
  kind: string;

  @Field(() => String)
  schema: string;

  connectionId?: string;

  @Field(() => [ColumnInfo], { nullable: true })
  columns?: ColumnInfo[];

  @Field(() => [String], { nullable: true })
  primaryKey?: string[];

  @Field(() => [ForeignKeyInfo], { nullable: true })
  foreignKeys?: ForeignKeyInfo[];

  @Field(() => [IndexInfo], { nullable: true })
  indexes?: IndexInfo[];
}

@ObjectType()
export class SchemaInfo {
  @Field(() => String)
  name: string;

  @Field(() => ID, { nullable: true })
  connectionId?: string;

  @Field(() => [TableInfo], { nullable: true })
  tables?: TableInfo[];
}

@ObjectType()
export class TableDataResultGql {
  @Field(() => [String])
  columns: string[];

  @Field(() => [GraphQLJSON])
  rows: Record<string, unknown>[];

  @Field(() => Int)
  rowCount: number;

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  offset: number;

  @Field(() => String, { nullable: true })
  sortColumn?: string | null;

  @Field(() => String, { nullable: true })
  sortOrder?: string | null;

  @Field(() => Int)
  executionTimeMs: number;

  @Field(() => Boolean)
  truncated: boolean;
}

@ObjectType()
export class DatabaseUser {
  @Field(() => String)
  username: string;

  @Field(() => Boolean, { nullable: true })
  isSuperuser?: boolean;

  @Field(() => String, { nullable: true })
  host?: string;
}

@ObjectType()
export class SchemaPermission {
  @Field(() => String)
  grantee: string;

  @Field(() => String)
  privilege: string;

  @Field(() => Boolean, { nullable: true })
  isGrantable?: boolean;
}
