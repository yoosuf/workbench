import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DiagramColumn {
  @Field(() => String)
  name: string;

  @Field(() => String)
  nativeType: string;

  @Field(() => String)
  dataKind: string;

  @Field(() => Boolean)
  isPrimaryKey: boolean;

  @Field(() => Boolean)
  isForeignKey: boolean;
}

@ObjectType()
export class DiagramNode {
  @Field(() => String)
  id: string;

  @Field(() => String)
  tableName: string;

  @Field(() => String)
  schema: string;

  @Field(() => Float)
  positionX: number;

  @Field(() => Float)
  positionY: number;

  @Field(() => [DiagramColumn])
  columns: DiagramColumn[];
}

@ObjectType()
export class DiagramEdge {
  @Field(() => String)
  id: string;

  @Field(() => String)
  source: string;

  @Field(() => String, { nullable: true })
  sourceHandle?: string;

  @Field(() => String)
  target: string;

  @Field(() => String, { nullable: true })
  targetHandle?: string;

  @Field(() => String)
  relationName: string;

  @Field(() => String)
  sourceColumn: string;

  @Field(() => String)
  targetColumn: string;
}

@ObjectType()
export class DiagramView {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  connectionId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  schema: string;

  @Field(() => [DiagramNode])
  nodes: DiagramNode[];

  @Field(() => [DiagramEdge])
  edges: DiagramEdge[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class DiagramSummary {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  connectionId: string;

  @Field(() => String)
  name: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
