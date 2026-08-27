import { renderBaseEmailLayout } from './email-base.template';

export interface WorkspaceInviteEmailData {
  inviterEmail: string;
  workspaceName: string;
  role: string;
  inviteUrl?: string;
}

export function renderWorkspaceInviteEmail(data: WorkspaceInviteEmailData): { subject: string; html: string } {
  const subject = `You've been invited to join "${data.workspaceName}" on Database Workbench`;
  const inviteUrl = data.inviteUrl || 'http://localhost:5173';

  const bodyContentHtml = `
    <p>Hello,</p>
    <p><strong style="color: #ffffff;">${data.inviterEmail}</strong> has invited you to collaborate in the <strong style="color: #58a6ff;">${data.workspaceName}</strong> workspace on Universal Database Workbench.</p>
    <div class="code-box">
      🏢 <strong>Workspace:</strong> ${data.workspaceName}<br>
      🛡️ <strong>Assigned Role:</strong> <span style="color: #7ee787;">${data.role}</span>
    </div>
    <p>As a workspace member, you can access shared database connections, collaborate on EER diagrams, and execute queries in sync with your team.</p>
  `;

  const html = renderBaseEmailLayout({
    title: `You're Invited to "${data.workspaceName}"`,
    preheader: `${data.inviterEmail} invited you to join ${data.workspaceName}`,
    bodyContentHtml,
    ctaText: 'Accept Invitation & Open Workspace',
    ctaUrl: inviteUrl,
  });

  return { subject, html };
}
