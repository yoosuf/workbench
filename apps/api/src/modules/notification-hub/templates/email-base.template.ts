export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
  bodyContentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function renderBaseEmailLayout(options: EmailLayoutOptions): string {
  const { title, preheader, bodyContentHtml, ctaText, ctaUrl } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #0d1117;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 24px 32px;
      background-color: #0d1117;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo {
      font-size: 16px;
      font-weight: 700;
      color: #58a6ff;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      background-color: rgba(35, 134, 54, 0.2);
      color: #3fb950;
      border: 1px solid rgba(63, 185, 80, 0.3);
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px;
    }
    .heading {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    .cta-container {
      margin: 28px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background-color: #238636;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(35, 134, 54, 0.3);
    }
    .cta-button:hover {
      background-color: #2ea043;
    }
    .footer {
      padding: 20px 32px;
      background-color: #0d1117;
      border-top: 1px solid #21262d;
      font-size: 11px;
      color: #8b949e;
      text-align: center;
    }
    .footer a {
      color: #58a6ff;
      text-decoration: none;
    }
    .code-box {
      background-color: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 12px;
      color: #79c0ff;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:0px;color:transparent;height:0;width:0;">${preheader}</span>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo">⚡ Universal Database Workbench</span>
        <span class="badge">Universal Edition</span>
      </div>
      <div class="content">
        <h1 class="heading">${title}</h1>
        ${bodyContentHtml}
        ${
          ctaText && ctaUrl
            ? `
        <div class="cta-container">
          <a href="${ctaUrl}" class="cta-button" target="_blank">${ctaText}</a>
        </div>
        `
            : ''
        }
      </div>
      <div class="footer">
        <p>This is an automated transactional notification from your Database Workbench instance.</p>
        <p>© ${new Date().getFullYear()} Universal Database Workbench. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
