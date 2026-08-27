import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class TableDataInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schema: string;

  @Field(() => String)
  @IsNotEmpty()
  table: string;

  @Field(() => Int, { nullable: true, defaultValue: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sortColumn?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

@InputType()
export class CreateSchemaInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schemaName: string;
}

@InputType()
export class DropSchemaInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schemaName: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  cascade?: boolean;
}

@InputType()
export class GrantSchemaPermissionInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schemaName: string;

  @Field(() => String)
  @IsNotEmpty()
  username: string;

  @Field(() => String)
  @IsNotEmpty()
  privilege: string;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  @IsOptional()
  grantAllTables?: boolean;
}

@InputType()
export class RevokeSchemaPermissionInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schemaName: string;

  @Field(() => String)
  @IsNotEmpty()
  username: string;

  @Field(() => String)
  @IsNotEmpty()
  privilege: string;
}
