import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class GenerateDiagramInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty()
  schema: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
}

@InputType()
export class NodePositionInput {
  @Field(() => String)
  @IsNotEmpty()
  nodeId: string;

  @Field(() => Float)
  @IsNumber()
  x: number;

  @Field(() => Float)
  @IsNumber()
  y: number;
}

@InputType()
export class SaveDiagramLayoutInput {
  @Field(() => ID)
  @IsNotEmpty()
  diagramId: string;

  @Field(() => [NodePositionInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodePositionInput)
  positions: NodePositionInput[];
}
