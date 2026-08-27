import { renderBaseEmailLayout } from './email-base.template';

export interface PermissionChangeEmailData {
  connectionName: string;
  accessLevel: string;
  grantedByEmail?: string;
  appUrl?: string;
}

export function renderPermissionChangeEmail(data: PermissionChangeEmailData): { subject: string; html: string } {
  const subject = `Your access level for "${data.connectionName}" is now ${data.accessLevel}`;
  const appUrl = data.appUrl || 'http://localhost:5173';

  const bodyContentHtml = `
    <p>Hello,</p>
    <p>Your permission access level for database connection <strong style="color: #ffffff;">${data.connectionName}</strong> has been updated.</p>
    <div class="code-box">
      🗄️ <strong>Database Connection:</strong> ${data.connectionName}<br>
      🛡️ <strong>New Access Level:</strong> <span style="color: #58a6ff; font-weight: bold;">${data.accessLevel}</span><br>
      ${data.grantedByEmail ? `👤 <strong>Updated By:</strong> ${data.grantedByEmail}` : ''}
    </div>
    <p>
      ${
        data.accessLevel === 'ADMIN'
          ? 'You have full administration rights (DDL, credentials, connection deletion, query execution).'
          : data.accessLevel === 'WRITE'
          ? 'You can run queries, browse data & schema, and design visual EER tables.'
          : 'You have read-only access (SELECT queries, schema browsing, non-mutating inspections).'
      }
    </p>
  `;

  const html = renderBaseEmailLayout({
    title: 'Connection Access Updated 🛡️',
    preheader: subject,
    bodyContentHtml,
    ctaText: 'Open Database Connection',
    ctaUrl: appUrl,
  });

  return { subject, html };
}
