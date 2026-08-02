// Server-only HTML email bodies, sent via Resend (see app/api/auth/*).
// Kept table-based with inline styles throughout — Gmail, Outlook, and most
// mobile mail clients strip <style> blocks or ignore modern CSS, so anything
// outside inline attributes on <table>/<td> is unreliable across clients.

const BRAND = "#e50914";
const INK = "#0b0b0b";
const INK_RAISED = "#141414";

function baseEmail({
  heading,
  message,
  ctaLabel,
  ctaLink,
  footerNote,
}: {
  heading: string;
  message: string;
  ctaLabel: string;
  ctaLink: string;
  footerNote: string;
}): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading} — Bayflix</title>
  </head>
  <body style="margin:0;padding:0;background-color:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${INK};padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background-color:${INK_RAISED};border-radius:10px;overflow:hidden;">
            <tr>
              <td style="padding:36px 40px 20px;text-align:center;">
                <span style="font-size:26px;font-weight:900;font-style:italic;color:${BRAND};letter-spacing:-0.5px;">BAYFLIX</span>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 40px 32px;text-align:center;">
                <h1 style="margin:0 0 14px;color:#ffffff;font-size:21px;font-weight:600;line-height:1.3;">
                  ${heading}
                </h1>
                <p style="margin:0 0 28px;color:#a3a3a3;font-size:14px;line-height:1.6;">
                  ${message}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="border-radius:5px;background-color:${BRAND};">
                      <a
                        href="${ctaLink}"
                        style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;"
                      >
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0;color:#737373;font-size:12px;line-height:1.6;">
                  ${footerNote}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px;border-top:1px solid #262626;text-align:center;">
                <p style="margin:0;color:#525252;font-size:11px;">&copy; ${year} Bayflix</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function magicLinkEmailHtml({ link, email }: { link: string; email: string }): string {
  return baseEmail({
    heading: "Sign in to Bayflix",
    message: `Tap the button below to sign in as<br /><strong style="color:#e5e5e5;">${escapeHtml(
      email
    )}</strong>. This link expires in 1 hour and works only once.`,
    ctaLabel: "Sign in to Bayflix",
    ctaLink: link,
    footerNote:
      "Didn't request this? You can safely ignore this email — no account changes happen until the link above is opened.",
  });
}

export function verificationEmailHtml({ link, email }: { link: string; email: string }): string {
  return baseEmail({
    heading: "Verify your email",
    message: `Confirm <strong style="color:#e5e5e5;">${escapeHtml(
      email
    )}</strong> to finish setting up your Bayflix account.`,
    ctaLabel: "Verify email",
    ctaLink: link,
    footerNote: "Didn't create a Bayflix account? You can safely ignore this email.",
  });
}

export function passwordResetEmailHtml({ link, email }: { link: string; email: string }): string {
  return baseEmail({
    heading: "Reset your password",
    message: `We got a request to reset the password for<br /><strong style="color:#e5e5e5;">${escapeHtml(
      email
    )}</strong>. Tap below to choose a new one.`,
    ctaLabel: "Reset password",
    ctaLink: link,
    footerNote:
      "Didn't request this? Your password won't change unless you open the link above and set a new one — this email alone doesn't do anything.",
  });
}

export function changeEmailHtml({ link, newEmail }: { link: string; newEmail: string }): string {
  return baseEmail({
    heading: "Confirm your new email",
    message: `Tap below to confirm <strong style="color:#e5e5e5;">${escapeHtml(
      newEmail
    )}</strong> as your new Bayflix sign-in email.`,
    ctaLabel: "Confirm new email",
    ctaLink: link,
    footerNote:
      "Didn't request this change? You can safely ignore this email — your Bayflix account keeps its current email until this link is opened.",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
