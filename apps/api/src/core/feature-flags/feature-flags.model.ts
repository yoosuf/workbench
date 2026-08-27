import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeatureFlagGql {
  @Field(() => String)
  key: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  description: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String)
  category: string;
}
