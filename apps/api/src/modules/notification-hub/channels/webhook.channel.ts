import { Injectable, Logger } from '@nestjs/common';

export interface SendWebhookPayload {
  url?: string;
  event: string;
  data: Record<string, any>;
  timestamp: string;
}

@Injectable()
export class WebhookNotificationChannel {
  private readonly logger = new Logger(WebhookNotificationChannel.name);

  async sendWebhook(payload: SendWebhookPayload): Promise<boolean> {
    const targetUrl = payload.url || process.env.DEFAULT_WEBHOOK_URL;
    if (!targetUrl) {
      this.logger.debug(`🔗 [WEBHOOK] No webhook URL configured, skipping external webhook delivery for [${payload.event}].`);
      return false;
    }

    try {
      this.logger.log(`🔗 [WEBHOOK] Sending webhook event "${payload.event}" to ${targetUrl}`);
      // Simulated or live fetch
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err: any) {
      this.logger.warn(`🔗 [WEBHOOK FAILED] Could not deliver to ${targetUrl}: ${err.message}`);
      return false;
    }
  }
}
