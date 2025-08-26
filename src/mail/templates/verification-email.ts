// Simple HTML email template builder (no React) for verification emails.
// Keeps styling inline for better client compatibility.

interface VerificationEmailOptions {
  verifyUrl: string;
  userName?: string | null;
  appName?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildVerificationEmail(opts: VerificationEmailOptions) {
  const appName = opts.appName || 'Chronocap';
  const safeUrl = escapeHtml(opts.verifyUrl);
  const greetingName = opts.userName ? escapeHtml(opts.userName) : 'there';

  const subject = `Verify your ${appName} email`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
  <style>
    a.btn { background:#2563eb; color:#ffffff !important; text-decoration:none; padding:12px 20px; border-radius:6px; display:inline-block; font-weight:600; }
    .container { max-width:560px; margin:0 auto; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; line-height:1.5; color:#111827; }
    .footer { font-size:12px; color:#6b7280; margin-top:32px; }
    code { background:#f3f4f6; padding:2px 4px; border-radius:4px; }
  </style>
  </head><body>
  <div class="container">
    <h1 style="font-size:20px; margin:0 0 16px;">Verify your email</h1>
    <p style="margin:0 0 12px;">Hi ${greetingName}, thanks for creating an account on <strong>${appName}</strong>.</p>
    <p style="margin:0 0 16px;">Please confirm this is your email address. This ensures you can receive unlocked capsule notifications in the future.</p>
    <p style="margin:24px 0; text-align:center;"><a class="btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Verify Email</a></p>
    <p style="margin:0 0 12px; font-size:14px;">If the button does not work, copy and paste this URL into your browser:</p>
    <p style="word-break:break-all; font-size:12px; line-height:1.4;">${safeUrl}</p>
    <p class="footer">If you did not sign up, you can ignore this email.</p>
  </div>
  </body></html>`;

  const text = `Hi ${greetingName},\nVerify your ${appName} email:\n${opts.verifyUrl}\nIf you did not sign up, ignore this message.`;

  return { subject, html, text };
}
