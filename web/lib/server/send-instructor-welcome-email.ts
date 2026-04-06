/**
 * Sends instructor credentials via Resend HTTP API (no extra npm package).
 * Set RESEND_API_KEY and RESEND_FROM_EMAIL (verified sender) in production.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendInstructorEmailResult = { sent: boolean; error?: string };

export async function sendInstructorWelcomeEmail(args: {
  to: string;
  name: string;
  temporaryPassword: string;
  appOrigin: string;
}): Promise<SendInstructorEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false };
  }

  const from = process.env.RESEND_FROM_EMAIL || "OptiCore <onboarding@resend.dev>";
  const loginUrl = `${args.appOrigin}/login`;

  const html = `
    <p>Hello ${escapeHtml(args.name)},</p>
    <p>Your <strong>OptiCore: Campus Intelligence System</strong> instructor account has been created.</p>
    <p><strong>Temporary password:</strong> <code style="font-size:14px">${escapeHtml(args.temporaryPassword)}</code></p>
    <p>Sign in at: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
    <p>On first sign-in you will be asked to set a new password. After that, open <strong>My schedule</strong> for your INS Form (Program by Teacher) view.</p>
    <p style="color:#666;font-size:12px">If you did not request this account, contact your college IT office.</p>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: "OptiCore — Your instructor account",
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { sent: false, error: text || res.statusText };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}
