import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface SendInAppPayload {
  userId: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  data?: Record<string, any>;
}

@Injectable()
export class InAppNotificationChannel {
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(private prisma: PrismaService) {}

  async sendInAppNotification(payload: SendInAppPayload): Promise<boolean> {
    try {
      await this.prisma.inAppNotification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type || 'INFO',
          data: payload.data || undefined,
        },
      });
      this.logger.log(`🔔 [IN-APP] Persisted in-app notification for user ${payload.userId}: "${payload.title}"`);
      return true;
    } catch (err: any) {
      this.logger.error(`🔔 [IN-APP ERROR] Failed to save in-app notification: ${err.message}`);
      return false;
    }
  }
}
