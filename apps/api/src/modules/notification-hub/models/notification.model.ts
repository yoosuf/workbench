import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InAppNotificationModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  message: string;

  @Field(() => String)
  type: string;

  @Field(() => Boolean)
  isRead: boolean;

  @Field(() => Date)
  createdAt: Date;
}
