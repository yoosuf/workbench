import { renderBaseEmailLayout } from './email-base.template';

export interface WelcomeEmailData {
  userEmail: string;
  appUrl?: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const subject = 'Welcome to Universal Database Workbench!';
  const appUrl = data.appUrl || 'http://localhost:5173';

  const bodyContentHtml = `
    <p>Hi <strong style="color: #ffffff;">${data.userEmail}</strong>,</p>
    <p>Welcome to <strong>Universal Database Workbench</strong> — your unified desktop & cloud platform for multi-engine database management, visual schema design, and team collaboration.</p>
    <div class="code-box">
      🚀 <strong>Getting Started:</strong><br>
      • Connect to PostgreSQL or MySQL databases with SSL/TLS encryption.<br>
      • Design and visualize relational schemas with interactive EER Diagrams.<br>
      • Organize your colleagues into Workspaces and Squads with GitHub-style team permissions.<br>
      • Run high-performance queries with our 10,000-row virtualized grid.
    </div>
    <p>Your default workspace has been provisioned. Click below to launch your session.</p>
  `;

  const html = renderBaseEmailLayout({
    title: 'Welcome Aboard! 🎉',
    preheader: 'Your Universal Database Workbench account is ready.',
    bodyContentHtml,
    ctaText: 'Launch Workbench',
    ctaUrl: appUrl,
  });

  return { subject, html };
}
