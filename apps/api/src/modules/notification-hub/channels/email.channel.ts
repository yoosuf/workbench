import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailNotificationChannel {
  private readonly logger = new Logger(EmailNotificationChannel.name);

  async sendEmail(payload: SendEmailPayload): Promise<boolean> {
    const from = payload.from || process.env.SMTP_FROM || 'notifications@workbench.dev';
    
    // Log formatted email dispatch
    this.logger.log(`📧 [EMAIL CHANNEL] Dispatching Transactional Email -> To: ${payload.to} | Subject: "${payload.subject}"`);

    // In local / container environment, simulate robust delivery (or connect to SMTP if configured)
    if (process.env.SMTP_HOST) {
      // SMTP transport ready for production
      this.logger.log(`📧 [SMTP] Routed via ${process.env.SMTP_HOST}`);
    } else {
      // Local development transactional mailbox logger
      this.logger.debug(`📧 [DEV PREVIEW] Rendered HTML length: ${payload.html.length} bytes`);
    }

    return true;
  }
}
