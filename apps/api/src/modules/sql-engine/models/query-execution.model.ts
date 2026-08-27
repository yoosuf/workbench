import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class QueryResultGql {
  @Field(() => [String])
  columns: string[];

  @Field(() => [GraphQLJSON])
  rows: Record<string, unknown>[];

  @Field(() => Int)
  rowCount: number;

  @Field(() => Int)
  executionTimeMs: number;

  @Field(() => Boolean)
  truncated: boolean;
}

@ObjectType()
export class QueryHistoryItem {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  connectionId: string;

  @Field(() => String)
  sql: string;

  @Field(() => Date)
  executedAt: Date;

  @Field(() => Int)
  durationMs: number;

  @Field(() => Int, { nullable: true })
  rowCount?: number | null;

  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  errorMessage?: string | null;
}

@ObjectType()
export class SavedQueryItem {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  connectionId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  sql: string;

  @Field(() => Date)
  createdAt: Date;
}
