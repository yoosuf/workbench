import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class TableColumnInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nativeType: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;
}

@InputType()
export class CreateTableInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  connectionId: string;

  @Field({ defaultValue: 'public' })
  @IsString()
  schema: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  tableName: string;

  @Field({ nullable: true, defaultValue: 'id' })
  @IsOptional()
  @IsString()
  primaryKeyColumn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  primaryKeyType?: string;

  @Field(() => [TableColumnInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableColumnInput)
  columns?: TableColumnInput[];

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  autoTimestamps?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  diagramId?: string;

  @Field({ nullable: true, defaultValue: 100 })
  @IsOptional()
  positionX?: number;

  @Field({ nullable: true, defaultValue: 100 })
  @IsOptional()
  positionY?: number;
}

@InputType()
export class AddColumnInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  connectionId: string;

  @Field({ defaultValue: 'public' })
  @IsString()
  schema: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  tableName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  columnName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  nativeType: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryKey?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  diagramId?: string;
}

@InputType()
export class AddForeignKeyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  connectionId: string;

  @Field({ defaultValue: 'public' })
  @IsString()
  schema: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  sourceTable: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  sourceColumn: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  referencedTable: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  referencedColumn: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  constraintName?: string;

  @Field({ nullable: true, defaultValue: 'CASCADE' })
  @IsOptional()
  @IsString()
  onDelete?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  diagramId?: string;
}

@InputType()
export class DropTableInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  connectionId: string;

  @Field({ defaultValue: 'public' })
  @IsString()
  schema: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  tableName: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  diagramId?: string;
}
