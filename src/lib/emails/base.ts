/**
 * Shared chrome for every transactional email.
 *
 * Table-based and inline-styled on purpose — Outlook and most Bangladeshi
 * webmail clients still strip <style> blocks and ignore flexbox.
 */

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";
const SUPPORT = process.env.SUPPORT_EMAIL || "support@example.com";

export function getEmailHeader() {
  // The mark is a hosted PNG rather than inline SVG: Gmail and Outlook both
  // strip <svg> out of email entirely, so an SVG logo would simply vanish.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:34px 40px 0 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;" valign="middle">
              <img src="${siteUrl}/logo-512.png" width="38" height="38" alt=""
                   style="display:block; border:0; border-radius:11px;">
            </td>
            <td valign="middle">
              <span style="color:#ffffff; font-size:20px; font-weight:800;">${escapeHtml(BRAND)}</span><br>
              <span style="color:#6b7280; font-size:9px; letter-spacing:1.4px; text-transform:uppercase;">Premium subscriptions, locally priced</span>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>
  `;
}

export function getEmailFooter() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:24px 40px 32px 40px; text-align:center;">
          <hr style="border:none; border-top:1px solid #1f1f1f; margin:0 0 18px 0;">
          <p style="margin:0 0 8px 0; font-size:11px; line-height:18px; color:#4b5563;">
            ${escapeHtml(BRAND)} &middot; Dhaka, Bangladesh
          </p>
          <p style="margin:0; font-size:11px; line-height:18px; color:#4b5563;">
            <a href="mailto:${escapeHtml(SUPPORT)}" style="color:#6b7280; text-decoration:underline;">Need help?</a>
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
