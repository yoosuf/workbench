import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AsyncNotificationQueue } from './queue/async-notification-queue';
import { EmailNotificationChannel } from './channels/email.channel';
import { WebhookNotificationChannel } from './channels/webhook.channel';
import { InAppNotificationChannel } from './channels/in-app.channel';
import { renderWelcomeEmail } from './templates/welcome.template';
import { renderWorkspaceInviteEmail } from './templates/workspace-invite.template';
import { renderTeamMemberEmail } from './templates/team-member.template';
import { renderPermissionChangeEmail } from './templates/permission-change.template';
import { renderSecurityAlertEmail } from './templates/security-alert.template';
import { InAppNotificationModel } from './models/notification.model';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private queue: AsyncNotificationQueue,
    private emailChannel: EmailNotificationChannel,
    private webhookChannel: WebhookNotificationChannel,
    private inAppChannel: InAppNotificationChannel,
  ) {}

  // ==========================================
  // TRANSACTIONAL NOTIFICATION TRIGGERS
  // ==========================================

  notifyWelcome(userId: string, userEmail: string): void {
    this.queue.enqueue('WELCOME', { userId, userEmail }, async (payload) => {
      const { subject, html } = renderWelcomeEmail({ userEmail: payload.userEmail });

      // 1. Email Channel
      await this.emailChannel.sendEmail({
        to: payload.userEmail,
        subject,
        html,
      });

      // 2. In-App Channel
      await this.inAppChannel.sendInAppNotification({
        userId: payload.userId,
        title: 'Welcome to Database Workbench!',
        message: 'Your personal workspace is ready. Connect a database to start designing EER diagrams and querying.',
        type: 'SUCCESS',
      });

      // 3. Webhook Channel
      await this.webhookChannel.sendWebhook({
        event: 'user.registered',
        data: { userId: payload.userId, email: payload.userEmail },
        timestamp: new Date().toISOString(),
      });
    });
  }

  notifyWorkspaceInvite(
    inviterEmail: string,
    inviteeEmail: string,
    workspaceName: string,
    role: string,
  ): void {
    this.queue.enqueue('WORKSPACE_INVITE', { inviterEmail, inviteeEmail, workspaceName, role }, async (payload) => {
      const { subject, html } = renderWorkspaceInviteEmail({
        inviterEmail: payload.inviterEmail,
        workspaceName: payload.workspaceName,
        role: payload.role,
      });

      await this.emailChannel.sendEmail({
        to: payload.inviteeEmail,
        subject,
        html,
      });

      // Find user if already exists for in-app notification
      const user = await this.prisma.user.findUnique({
        where: { email: payload.inviteeEmail.toLowerCase().trim() },
      });
      if (user) {
        await this.inAppChannel.sendInAppNotification({
          userId: user.id,
          title: `Invited to "${payload.workspaceName}"`,
          message: `${payload.inviterEmail} invited you to join "${payload.workspaceName}" as ${payload.role}.`,
          type: 'INFO',
        });
      }

      await this.webhookChannel.sendWebhook({
        event: 'workspace.member_invited',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });
  }

  notifyTeamMember(
    userId: string,
    userEmail: string,
    teamName: string,
    workspaceName: string,
    action: 'ADDED' | 'REMOVED',
  ): void {
    this.queue.enqueue('TEAM_MEMBERSHIP', { userId, userEmail, teamName, workspaceName, action }, async (payload) => {
      const { subject, html } = renderTeamMemberEmail({
        teamName: payload.teamName,
        workspaceName: payload.workspaceName,
        action: payload.action,
      });

      await this.emailChannel.sendEmail({
        to: payload.userEmail,
        subject,
        html,
      });

      await this.inAppChannel.sendInAppNotification({
        userId: payload.userId,
        title: payload.action === 'ADDED' ? `Added to @${payload.teamName}` : `Removed from @${payload.teamName}`,
        message:
          payload.action === 'ADDED'
            ? `You have joined squad @${payload.teamName} in workspace "${payload.workspaceName}".`
            : `You were removed from squad @${payload.teamName} in workspace "${payload.workspaceName}".`,
        type: payload.action === 'ADDED' ? 'SUCCESS' : 'WARNING',
      });

      await this.webhookChannel.sendWebhook({
        event: 'team.membership_changed',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });
  }

  notifyPermissionChange(
    userId: string,
    userEmail: string,
    connectionName: string,
    accessLevel: string,
    grantedByEmail?: string,
  ): void {
    this.queue.enqueue('PERMISSION_CHANGE', { userId, userEmail, connectionName, accessLevel, grantedByEmail }, async (payload) => {
      const { subject, html } = renderPermissionChangeEmail({
        connectionName: payload.connectionName,
        accessLevel: payload.accessLevel,
        grantedByEmail: payload.grantedByEmail,
      });

      await this.emailChannel.sendEmail({
        to: payload.userEmail,
        subject,
        html,
      });

      await this.inAppChannel.sendInAppNotification({
        userId: payload.userId,
        title: `Connection Access Updated`,
        message: `Your permission for "${payload.connectionName}" is now ${payload.accessLevel}.`,
        type: 'INFO',
      });

      await this.webhookChannel.sendWebhook({
        event: 'connection.permission_changed',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });
  }

  notifySecurityAlert(
    userEmail: string,
    connectionName: string,
    attemptedAction: string,
    reason: string,
  ): void {
    this.queue.enqueue('SECURITY_ALERT', { userEmail, connectionName, attemptedAction, reason }, async (payload) => {
      const { subject, html } = renderSecurityAlertEmail({
        userEmail: payload.userEmail,
        connectionName: payload.connectionName,
        attemptedAction: payload.attemptedAction,
        reason: payload.reason,
      });

      // Find user to alert in-app
      const user = await this.prisma.user.findUnique({
        where: { email: payload.userEmail },
      });
      if (user) {
        await this.inAppChannel.sendInAppNotification({
          userId: user.id,
          title: `⚠️ Security Warning`,
          message: `Attempted action "${payload.attemptedAction}" on "${payload.connectionName}" was blocked: ${payload.reason}`,
          type: 'ALERT',
        });
      }

      // Send to administrator mailbox
      const adminEmail = process.env.ADMIN_SECURITY_EMAIL || payload.userEmail;
      await this.emailChannel.sendEmail({
        to: adminEmail,
        subject,
        html,
      });

      await this.webhookChannel.sendWebhook({
        event: 'security.action_blocked',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // ==========================================
  // IN-APP NOTIFICATION QUERIES & MUTATIONS
  // ==========================================

  async listNotifications(userId: string): Promise<InAppNotificationModel[]> {
    const notifications = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { userId, isRead: false },
    });
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
    await this.prisma.inAppNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    await this.prisma.inAppNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return true;
  }
}
