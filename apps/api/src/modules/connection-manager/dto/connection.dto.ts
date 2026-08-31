import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Engine, ConnectionAccessLevel } from '@prisma/client';

@InputType()
export class CreateConnectionInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Connection name is required' })
  name: string;

  @Field(() => Engine)
  @IsEnum(Engine, { message: 'Engine must be MYSQL, POSTGRES, or MSSQL' })
  engine: Engine;

  @Field(() => String)
  @IsNotEmpty({ message: 'Host is required' })
  host: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @Field(() => String)
  @IsNotEmpty({ message: 'Database name is required' })
  database: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @Field(() => String)
  @IsString()
  password: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  ssl?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sslMode?: string;

  @Field(() => ConnectionAccessLevel, { nullable: true })
  @IsOptional()
  @IsEnum(ConnectionAccessLevel)
  accessLevel?: ConnectionAccessLevel;
}

@InputType()
export class TestConnectionInput {
  @Field(() => Engine)
  @IsEnum(Engine, { message: 'Engine must be MYSQL, POSTGRES, or MSSQL' })
  engine: Engine;

  @Field(() => String)
  @IsNotEmpty({ message: 'Host is required' })
  host: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @Field(() => String)
  @IsNotEmpty({ message: 'Database name is required' })
  database: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @Field(() => String)
  @IsString()
  password: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  ssl?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sslMode?: string;
}
