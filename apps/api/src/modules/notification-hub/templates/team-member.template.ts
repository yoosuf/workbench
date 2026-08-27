import { renderBaseEmailLayout } from './email-base.template';

export interface TeamMemberEmailData {
  teamName: string;
  workspaceName: string;
  action: 'ADDED' | 'REMOVED';
  appUrl?: string;
}

export function renderTeamMemberEmail(data: TeamMemberEmailData): { subject: string; html: string } {
  const isAdded = data.action === 'ADDED';
  const subject = isAdded
    ? `You were added to the @${data.teamName} squad in "${data.workspaceName}"`
    : `You were removed from the @${data.teamName} squad in "${data.workspaceName}"`;
  const appUrl = data.appUrl || 'http://localhost:5173';

  const bodyContentHtml = `
    <p>Hello,</p>
    <p>${
      isAdded
        ? `You have been added to the <strong style="color: #bc8cff;">@${data.teamName}</strong> team in the <strong>${data.workspaceName}</strong> workspace.`
        : `You have been removed from the <strong style="color: #bc8cff;">@${data.teamName}</strong> team in the <strong>${data.workspaceName}</strong> workspace.`
    }</p>
    <div class="code-box">
      👥 <strong>Squad:</strong> @${data.teamName}<br>
      🏢 <strong>Workspace:</strong> ${data.workspaceName}<br>
      ⚡ <strong>Status:</strong> ${isAdded ? 'Active Member' : 'Removed'}
    </div>
    <p>${
      isAdded
        ? 'You automatically inherit all database connection permissions configured for this squad.'
        : 'Your squad-level connection permissions have been revoked accordingly.'
    }</p>
  `;

  const html = renderBaseEmailLayout({
    title: isAdded ? `Welcome to @${data.teamName}! 👥` : `Team Membership Updated`,
    preheader: subject,
    bodyContentHtml,
    ctaText: 'View Workspace Teams',
    ctaUrl: appUrl,
  });

  return { subject, html };
}
