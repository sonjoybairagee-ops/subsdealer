import { getEmailHeader, getEmailFooter, escapeHtml } from "./base";

/**
 * Transactional emails for the subscription portal.
 *
 * Hard rule: these templates never contain a password, and never contain
 * the account email of a shared credential. Email is not a safe channel
 * for either — we send people to the dashboard, which checks ownership
 * and expiry on every view.
 */

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

export { escapeHtml };

function shell({
  title,
  pill,
  pillColor = "#22c55e",
  body,
  ctaLabel,
  ctaPath = "/dashboard",
}: {
  title: string;
  pill: string;
  pillColor?: string;
  body: string;
  ctaLabel: string;
  ctaPath?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - ${escapeHtml(BRAND)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px; background-color:#111111; border:1px solid #1f1f1f; border-radius:10px; overflow:hidden;">
          ${getEmailHeader()}
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <span style="display:inline-block; background-color:rgba(34,197,94,0.1); border:1px solid ${pillColor}4d; color:${pillColor}; font-size:11px; font-weight:600; letter-spacing:0.5px; padding:5px 12px; border-radius:20px;">
                &#9679; ${escapeHtml(pill)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 8px 40px;">
              <h1 style="margin:0 0 16px 0; font-size:24px; line-height:30px; color:#ffffff; font-weight:700;">
                ${escapeHtml(title)}
              </h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background-color:#22c55e; text-align:center;">
                    <a href="${siteUrl}${ctaPath}"
                       style="display:block; padding:14px 0; color:#0a0a0a; text-decoration:none; font-size:14px; font-weight:700;">
                      ${escapeHtml(ctaLabel)} &nbsp;&#8594;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${getEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#a0a0a0;">${text}</p>`;

/** Sent when an admin rotates the password on a credential in use. */
export function getCredentialRotatedEmailHtml({
  customerName,
  productName,
}: {
  customerName: string;
  productName: string;
}) {
  return shell({
    title: "Your login details changed",
    pill: "CREDENTIAL UPDATED",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `We refreshed the login for your <strong style="color:#ffffff;">${escapeHtml(
          productName,
        )}</strong> subscription. Your previous password no longer works.`,
      ) +
      p(
        `Open your dashboard to copy the new email and password. Your plan dates and remaining days are unchanged — only the login moved.`,
      ) +
      p(
        `<span style="color:#6b7280; font-size:13px;">For your security we never send passwords by email.</span>`,
      ),
    ctaLabel: "View my new login",
  });
}

/** Sent when a subscription finally gets a credential bound to it. */
export function getSubscriptionReadyEmailHtml({
  customerName,
  productName,
  planName,
  expiryDate,
}: {
  customerName: string;
  productName: string;
  planName: string;
  expiryDate: string;
}) {
  return shell({
    title: `Your ${productName} access is live`,
    pill: "SUBSCRIPTION ACTIVE",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Your <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> subscription is ready to use.`,
      ) +
      `<div style="background-color:#0d0d0d; border:1px solid #1f1f1f; border-radius:8px; padding:16px 18px; margin:0 0 18px 0;">
         <p style="margin:0 0 6px 0; font-size:12px; color:#6b7280;">Plan</p>
         <p style="margin:0 0 12px 0; font-size:15px; color:#ffffff; font-weight:600;">${escapeHtml(planName)}</p>
         <p style="margin:0 0 6px 0; font-size:12px; color:#6b7280;">Valid until</p>
         <p style="margin:0; font-size:15px; color:#22c55e; font-weight:600;">${escapeHtml(expiryDate)}</p>
       </div>` +
      p(`Head to your dashboard to reveal and copy your login details.`),
    ctaLabel: "Open my dashboard",
  });
}

/**
 * Sent when an admin has sent the team invite for an invite-delivered
 * product. Tells them where to look — an invite sitting unopened in a spam
 * folder is the most common "it does not work" ticket.
 */
export function getInviteSentEmailHtml({
  customerName,
  productName,
  inviteEmail,
  expiryDate,
}: {
  customerName: string;
  productName: string;
  inviteEmail: string;
  expiryDate: string;
}) {
  return shell({
    title: `Your ${productName} invite is on its way`,
    pill: "INVITE SENT",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `We have sent your <strong style="color:#ffffff;">${escapeHtml(
          productName,
        )}</strong> team invite to:`,
      ) +
      `<div style="background-color:#0d0d0d; border:1px dashed #22c55e; border-radius:8px; padding:16px; text-align:center; margin:0 0 18px 0;">
         <p style="margin:0; font-size:16px; font-family:monospace; font-weight:700; color:#22c55e;">${escapeHtml(inviteEmail)}</p>
       </div>` +
      p(
        `Open that inbox and accept the invite — premium switches on straight away, on your own account.`,
      ) +
      p(
        `<strong style="color:#ffffff;">Cannot find it?</strong> Check your spam and promotions folders. The invite comes from ${escapeHtml(
          productName,
        )}, not from us.`,
      ) +
      p(
        `<span style="color:#6b7280; font-size:13px;">Your subscription runs until ${escapeHtml(
          expiryDate,
        )}. Please stay in the team for that whole period — leaving it ends your access.</span>`,
      ),
    ctaLabel: "View my subscription",
  });
}

/** Renewal nudge, sent a few days before expiry. */
export function getSubscriptionExpiringEmailHtml({
  customerName,
  productName,
  daysLeft,
  expiryDate,
}: {
  customerName: string;
  productName: string;
  daysLeft: number;
  expiryDate: string;
}) {
  return shell({
    title: daysLeft <= 1 ? "Your subscription expires tomorrow" : `${daysLeft} days left on your subscription`,
    pill: "RENEWAL REMINDER",
    pillColor: "#f59e0b",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Your <strong style="color:#ffffff;">${escapeHtml(
          productName,
        )}</strong> subscription ends on <strong style="color:#ffffff;">${escapeHtml(expiryDate)}</strong>.`,
      ) +
      p(
        `After that the login stops working and is handed to someone else, so renew before then if you want to keep the same access.`,
      ),
    ctaLabel: "Renew now",
  });
}

/** Sent the day a subscription lapses. */
export function getSubscriptionExpiredEmailHtml({
  customerName,
  productName,
}: {
  customerName: string;
  productName: string;
}) {
  return shell({
    title: "Your subscription has ended",
    pill: "EXPIRED",
    pillColor: "#9ca3af",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Your <strong style="color:#ffffff;">${escapeHtml(
          productName,
        )}</strong> subscription has expired and the login has been withdrawn.`,
      ) +
      p(`Renewing takes a minute and you will get fresh access right away.`),
    ctaLabel: "Renew my subscription",
  });
}
