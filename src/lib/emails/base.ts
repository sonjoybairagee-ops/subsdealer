/**
 * Shared chrome for all Subsdealer transactional emails.
 *
 * Designed with Subsdealer dark theme aesthetic:
 * - Background: #0d1117
 * - Card Container: #121620
 * - Border: #1e293b
 * - Primary Brand Red: #e5243b
 * - Typography: Inter / system sans-serif
 */

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";
const SUPPORT = process.env.SUPPORT_EMAIL || "support@compxorbit.com";

export function getEmailHeader() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px 36px 20px 36px; border-bottom:1px solid #1e293b;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;" valign="middle">
                <div style="background-color:#e5243b; width:40px; height:40px; border-radius:12px; text-align:center; line-height:40px;">
                  <span style="color:#ffffff; font-size:22px; font-weight:900; font-family:sans-serif;">S</span>
                </div>
              </td>
              <td valign="middle">
                <span style="color:#ffffff; font-size:22px; font-weight:900; letter-spacing:-0.5px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(BRAND)}</span><br>
                <span style="color:#e5243b; font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; font-family:sans-serif;">PREMIUM SUBSCRIPTIONS, LOCALLY PRICED</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function getEmailFooter() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:28px 36px 32px 36px; text-align:center; border-top:1px solid #1e293b; background-color:#0b0e14;">
          <p style="margin:0 0 10px 0; font-size:12px; color:#94a3b8; font-family:sans-serif;">
            Need assistance with your order? Our support team is here to help.
          </p>
          <p style="margin:0 0 16px 0; font-size:12px; color:#94a3b8; font-family:sans-serif;">
            <a href="mailto:${escapeHtml(SUPPORT)}" style="color:#e5243b; font-weight:600; text-decoration:none;">Email Support</a> &nbsp;&bull;&nbsp;
            <a href="${siteUrl}/dashboard" style="color:#e5243b; font-weight:600; text-decoration:none;">My Dashboard</a>
          </p>
          <p style="margin:0; font-size:11px; color:#64748b; font-family:sans-serif;">
            &copy; ${new Date().getFullYear()} ${escapeHtml(BRAND)} &middot; Dhaka, Bangladesh. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function escapeHtml(value: string): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
