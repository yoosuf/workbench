import { Field, ID, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class ExecuteQueryInput {
  @Field(() => ID)
  @IsNotEmpty({ message: 'connectionId is required' })
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'SQL query string is required' })
  sql: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  overrideLimits?: boolean;
}

@InputType()
export class SaveQueryInput {
  @Field(() => ID)
  @IsNotEmpty()
  connectionId: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Query name is required' })
  name: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'SQL query cannot be empty' })
  sql: string;
}
