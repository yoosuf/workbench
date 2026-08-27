import { renderBaseEmailLayout } from './email-base.template';

export interface SecurityAlertEmailData {
  userEmail: string;
  connectionName: string;
  attemptedAction: string;
  reason: string;
  timestamp?: string;
  appUrl?: string;
}

export function renderSecurityAlertEmail(data: SecurityAlertEmailData): { subject: string; html: string } {
  const subject = `⚠️ Security Alert: Blocked unauthorized action on "${data.connectionName}"`;
  const appUrl = data.appUrl || 'http://localhost:5173';

  const bodyContentHtml = `
    <p>Hello Security Administrator,</p>
    <p>A restricted action was intercepted and blocked by the Universal Database Workbench security engine.</p>
    <div class="code-box" style="border-color: #f85149; color: #ff7b72;">
      ⚠️ <strong>Security Event:</strong> Unauthorized Action Blocked<br>
      👤 <strong>User:</strong> ${data.userEmail}<br>
      🗄️ <strong>Target Connection:</strong> ${data.connectionName}<br>
      🚫 <strong>Attempted Action:</strong> ${data.attemptedAction}<br>
      🛑 <strong>Reason:</strong> ${data.reason}<br>
      🕒 <strong>Timestamp:</strong> ${data.timestamp || new Date().toISOString()}
    </div>
    <p>The operation was prevented. No unauthorized database mutations occurred.</p>
  `;

  const html = renderBaseEmailLayout({
    title: '⚠️ Security Alert Notification',
    preheader: subject,
    bodyContentHtml,
    ctaText: 'Review Security Audit Logs',
    ctaUrl: appUrl,
  });

  return { subject, html };
}
