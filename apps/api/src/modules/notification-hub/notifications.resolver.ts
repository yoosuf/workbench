import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { InAppNotificationModel } from './models/notification.model';
import { GqlAuthGuard, CurrentUser } from '../../core/security';
import { User } from '../identity-access/models/user.model';

@Resolver(() => InAppNotificationModel)
@UseGuards(GqlAuthGuard)
export class NotificationsResolver {
  constructor(private notificationsService: NotificationsService) {}

  @Query(() => [InAppNotificationModel])
  async listNotifications(@CurrentUser() user: User): Promise<InAppNotificationModel[]> {
    return this.notificationsService.listNotifications(user.id);
  }

  @Query(() => Int)
  async unreadNotificationCount(@CurrentUser() user: User): Promise<number> {
    return this.notificationsService.unreadCount(user.id);
  }

  @Mutation(() => Boolean)
  async markNotificationRead(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.notificationsService.markNotificationRead(user.id, id);
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() user: User): Promise<boolean> {
    return this.notificationsService.markAllNotificationsRead(user.id);
  }
}
