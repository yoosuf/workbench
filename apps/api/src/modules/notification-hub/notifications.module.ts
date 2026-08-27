import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { AsyncNotificationQueue } from './queue/async-notification-queue';
import { EmailNotificationChannel } from './channels/email.channel';
import { WebhookNotificationChannel } from './channels/webhook.channel';
import { InAppNotificationChannel } from './channels/in-app.channel';

@Module({
  providers: [
    NotificationsService,
    NotificationsResolver,
    AsyncNotificationQueue,
    EmailNotificationChannel,
    WebhookNotificationChannel,
    InAppNotificationChannel,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
