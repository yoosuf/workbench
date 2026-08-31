import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Engine, ConnectionAccessLevel } from '@prisma/client';

registerEnumType(Engine, {
  name: 'Engine',
  description: 'Database Engine Type (MYSQL, POSTGRES, or MSSQL)',
});

@ObjectType()
export class Connection {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  workspaceId?: string;

  @Field(() => String)
  name: string;

  @Field(() => Engine)
  engine: Engine;

  @Field(() => String)
  host: string;

  @Field(() => Int)
  port: number;

  @Field(() => String)
  database: string;

  @Field(() => String)
  username: string;

  @Field(() => Boolean, { nullable: true })
  ssl?: boolean;

  @Field(() => String, { nullable: true })
  sslMode?: string;

  @Field(() => ConnectionAccessLevel, { nullable: true })
  accessLevel?: ConnectionAccessLevel;

  @Field(() => ConnectionAccessLevel, { nullable: true })
  effectiveAccessLevel?: ConnectionAccessLevel;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class TestConnectionResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Int)
  latencyMs: number;
}
