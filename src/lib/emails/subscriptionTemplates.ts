import { getEmailHeader, getEmailFooter, escapeHtml } from "./base";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

export { escapeHtml };

function brandShell({
  title,
  pill,
  pillBg = "rgba(229,36,59,0.12)",
  pillColor = "#e5243b",
  body,
  ctaLabel,
  ctaPath = "/dashboard",
  ctaUrl,
}: {
  title: string;
  pill: string;
  pillBg?: string;
  pillColor?: string;
  body: string;
  ctaLabel?: string;
  ctaPath?: string;
  ctaUrl?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const targetUrl = ctaUrl || `${siteUrl}${ctaPath}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - ${escapeHtml(BRAND)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0d1117; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117; padding:30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px; background-color:#121620; border:1px solid #1e293b; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          ${getEmailHeader()}
          <tr>
            <td style="padding:28px 36px 8px 36px;">
              <span style="display:inline-block; background-color:${pillBg}; border:1px solid ${pillColor}40; color:${pillColor}; font-size:10px; font-weight:800; letter-spacing:1px; text-transform:uppercase; padding:5px 14px; border-radius:20px; font-family:sans-serif;">
                &#9679; ${escapeHtml(pill)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 36px 12px 36px;">
              <h1 style="margin:0 0 16px 0; font-size:24px; line-height:32px; color:#ffffff; font-weight:900; letter-spacing:-0.5px;">
                ${escapeHtml(title)}
              </h1>
              ${body}
            </td>
          </tr>
          ${
            ctaLabel
              ? `<tr>
            <td style="padding:16px 36px 32px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px; background-color:#e5243b; text-align:center; box-shadow:0 4px 14px rgba(229,36,59,0.35);">
                    <a href="${targetUrl}"
                       style="display:block; padding:15px 24px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; font-family:sans-serif; letter-spacing:0.2px;">
                      ${escapeHtml(ctaLabel)} &nbsp;&#8594;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }
          ${getEmailFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 14px 0; font-size:14px; line-height:22px; color:#94a3b8; font-family:sans-serif;">${text}</p>`;

/** 1. CONFIRM EMAIL / WELCOME EMAIL */
export function getConfirmEmailHtml({
  customerName,
  confirmationUrl,
}: {
  customerName: string;
  confirmationUrl: string;
}) {
  return brandShell({
    title: "Confirm your email address",
    pill: "WELCOME TO SUBSDEALER",
    pillColor: "#e5243b",
    body:
      p(`Hi ${escapeHtml(customerName || "there")},`) +
      p(
        `Welcome to <strong style="color:#ffffff;">${escapeHtml(BRAND)}</strong>! Please confirm your email address to complete your account setup and access your dashboard.`,
      ) +
      `<div style="background-color:#0b0e14; border:1px solid #1e293b; border-radius:12px; padding:20px; margin:16px 0 20px 0;">
         <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#ffffff;">Why verify?</p>
         <p style="margin:0; font-size:12px; color:#94a3b8; line-height:18px;">
           Verifying your email protects your subscription access, private login credentials, and enables instant order notifications.
         </p>
       </div>`,
    ctaLabel: "Confirm My Email Address",
    ctaUrl: confirmationUrl,
  });
}

/** 2. RESET PASSWORD EMAIL */
export function getResetPasswordEmailHtml({
  customerName,
  resetUrl,
}: {
  customerName: string;
  resetUrl: string;
}) {
  return brandShell({
    title: "Reset your password",
    pill: "SECURITY VERIFICATION",
    pillBg: "rgba(245,158,11,0.12)",
    pillColor: "#f59e0b",
    body:
      p(`Hi ${escapeHtml(customerName || "Valued User")},`) +
      p(
        `We received a request to reset the password for your <strong style="color:#ffffff;">${escapeHtml(BRAND)}</strong> account.`,
      ) +
      `<div style="background-color:#0b0e14; border:1px solid #1e293b; border-radius:12px; padding:20px; margin:16px 0 20px 0;">
         <p style="margin:0 0 8px 0; font-size:13px; font-weight:700; color:#f59e0b;">🔒 Security Notice</p>
         <p style="margin:0; font-size:12px; color:#94a3b8; line-height:18px;">
           This link will expire in 60 minutes. If you did not request a password reset, you can safely ignore this email — your account remains secure.
         </p>
       </div>`,
    ctaLabel: "Set New Password",
    ctaUrl: resetUrl,
  });
}

/** 3. ORDER CONFIRMATION EMAIL (SENT INSTANTLY UPON ORDER) */
export function getOrderConfirmationEmailHtml({
  customerName,
  orderId,
  productName,
  planName,
  amountBdt,
  txnRef,
}: {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amountBdt: number;
  txnRef: string;
}) {
  const isFree = amountBdt === 0;

  return brandShell({
    title: isFree ? "🎁 Free Promo Claim Received" : "Order Confirmation",
    pill: isFree ? "FREE CLAIM SUBMITTED" : "ORDER RECEIVED",
    pillColor: isFree ? "#a855f7" : "#e5243b",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Thank you for your order on <strong style="color:#ffffff;">${escapeHtml(BRAND)}</strong>! We have received your order request and our verification team is reviewing it.`,
      ) +
      `<div style="background-color:#0b0e14; border:1px solid #1e293b; border-radius:12px; padding:20px; margin:16px 0 20px 0;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:sans-serif; font-size:13px;">
           <tr>
             <td style="padding:6px 0; color:#64748b;">Order ID</td>
             <td style="padding:6px 0; color:#ffffff; font-weight:700; text-align:right; font-family:monospace;">${escapeHtml(orderId.slice(0, 8))}</td>
           </tr>
           <tr>
             <td style="padding:6px 0; color:#64748b;">Item</td>
             <td style="padding:6px 0; color:#ffffff; font-weight:700; text-align:right;">${escapeHtml(productName)}</td>
           </tr>
           <tr>
             <td style="padding:6px 0; color:#64748b;">Plan</td>
             <td style="padding:6px 0; color:#94a3b8; text-align:right;">${escapeHtml(planName)}</td>
           </tr>
           <tr>
             <td style="padding:6px 0; color:#64748b;">Reference / Txn ID</td>
             <td style="padding:6px 0; color:#e5243b; font-weight:700; text-align:right; font-family:monospace;">${escapeHtml(txnRef)}</td>
           </tr>
           <tr style="border-top:1px solid #1e293b;">
             <td style="padding:10px 0 0 0; color:#ffffff; font-weight:800; font-size:15px;">Total Amount</td>
             <td style="padding:10px 0 0 0; color:${isFree ? "#a855f7" : "#22c55e"}; font-weight:900; font-size:16px; text-align:right;">${isFree ? "৳0 (Free Claim)" : `৳${amountBdt.toLocaleString()}`}</td>
           </tr>
         </table>
       </div>` +
      p(
        `Orders are verified quickly. Once approved, your login credentials or team invite will be delivered directly to your dashboard.`,
      ),
    ctaLabel: "Track Order Status",
    ctaPath: "/dashboard",
  });
}

/** 4. INVOICE GENERATION & SUBSCRIPTION DELIVERY EMAIL */
export function getInvoiceDeliveryEmailHtml({
  customerName,
  orderId,
  productName,
  planName,
  amountBdt,
  txnRef,
  expiryDate,
  deliveryNote,
}: {
  customerName: string;
  orderId: string;
  productName: string;
  planName: string;
  amountBdt: number;
  txnRef: string;
  expiryDate: string;
  deliveryNote?: string;
}) {
  const isFree = amountBdt === 0;

  return brandShell({
    title: `Tax Invoice & ${productName} Access Live`,
    pill: "OFFICIAL INVOICE & DELIVERED",
    pillBg: "rgba(34,197,94,0.12)",
    pillColor: "#22c55e",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Your payment for <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> has been verified. Here is your official invoice and access activation notice.`,
      ) +
      /* ---- Itemized Receipt Table ---- */
      `<div style="background-color:#0b0e14; border:1px solid #1e293b; border-radius:12px; padding:22px; margin:16px 0 20px 0;">
         <div style="border-bottom:1px solid #1e293b; padding-bottom:12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
           <span style="font-size:11px; font-weight:800; color:#e5243b; letter-spacing:1px; font-family:sans-serif;">INVOICE #${escapeHtml(orderId.slice(0, 8).toUpperCase())}</span>
           <span style="font-size:11px; font-weight:800; background-color:rgba(34,197,94,0.15); color:#22c55e; padding:3px 10px; border-radius:12px; font-family:sans-serif;">${isFree ? "PROMO CLAIMED" : "PAID VIA BKASH"}</span>
         </div>

         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:sans-serif; font-size:13px;">
           <tr style="border-bottom:1px solid #1a2234;">
             <td style="padding:8px 0; color:#64748b; font-weight:700;">Description</td>
             <td style="padding:8px 0; color:#64748b; font-weight:700; text-align:right;">Amount</td>
           </tr>
           <tr>
             <td style="padding:10px 0; color:#ffffff; font-weight:700;">
               ${escapeHtml(productName)}<br>
               <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Plan: ${escapeHtml(planName)}</span>
             </td>
             <td style="padding:10px 0; color:#ffffff; font-weight:800; text-align:right;">${isFree ? "৳0" : `৳${amountBdt.toLocaleString()}`}</td>
           </tr>
           <tr style="border-top:1px solid #1e293b;">
             <td style="padding:10px 0 4px 0; color:#64748b;">Transaction Reference</td>
             <td style="padding:10px 0 4px 0; color:#e5243b; font-weight:700; text-align:right; font-family:monospace;">${escapeHtml(txnRef)}</td>
           </tr>
           <tr>
             <td style="padding:4px 0 10px 0; color:#64748b;">Subscription Valid Until</td>
             <td style="padding:4px 0 10px 0; color:#22c55e; font-weight:800; text-align:right;">${escapeHtml(expiryDate)}</td>
           </tr>
           <tr style="border-top:2px solid #1e293b;">
             <td style="padding:12px 0 0 0; color:#ffffff; font-weight:900; font-size:15px;">Total Paid</td>
             <td style="padding:12px 0 0 0; color:#22c55e; font-weight:900; font-size:17px; text-align:right;">${isFree ? "৳0 (Free)" : `৳${amountBdt.toLocaleString()}`}</td>
           </tr>
         </table>
       </div>` +
      (deliveryNote
        ? `<div style="background-color:rgba(229,36,59,0.08); border:1px solid rgba(229,36,59,0.25); border-radius:12px; padding:16px; margin:0 0 20px 0;">
             <p style="margin:0 0 4px 0; font-size:12px; font-weight:800; color:#e5243b;">📌 Activation Instructions</p>
             <p style="margin:0; font-size:13px; color:#ffffff; line-height:20px;">${escapeHtml(deliveryNote)}</p>
           </div>`
        : "") +
      p(`Access details are available inside your dashboard. Click below to reveal your login or invite.`),
    ctaLabel: "Reveal Access in Dashboard",
    ctaPath: "/dashboard",
  });
}

/** Existing helpers maintained for backwards compatibility */
export function getCredentialRotatedEmailHtml({
  customerName,
  productName,
}: {
  customerName: string;
  productName: string;
}) {
  return brandShell({
    title: "Your login details changed",
    pill: "CREDENTIAL UPDATED",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `We refreshed the login for your <strong style="color:#ffffff;">${escapeHtml(
          productName,
        )}</strong> subscription. Your previous password no longer works.`,
      ) +
      p(`Open your dashboard to copy the new email and password. Your plan dates and remaining days are unchanged.`) +
      p(`<span style="color:#64748b; font-size:12px;">For your security we never send passwords directly by email.</span>`),
    ctaLabel: "View New Login Details",
  });
}

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
  return brandShell({
    title: `Your ${productName} access is live`,
    pill: "SUBSCRIPTION ACTIVE",
    pillColor: "#22c55e",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(`Your <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> subscription is ready to use.`) +
      `<div style="background-color:#0b0e14; border:1px solid #1e293b; border-radius:12px; padding:18px; margin:0 0 20px 0;">
         <p style="margin:0 0 4px 0; font-size:12px; color:#64748b;">Plan</p>
         <p style="margin:0 0 12px 0; font-size:15px; color:#ffffff; font-weight:700;">${escapeHtml(planName)}</p>
         <p style="margin:0 0 4px 0; font-size:12px; color:#64748b;">Valid until</p>
         <p style="margin:0; font-size:15px; color:#22c55e; font-weight:700;">${escapeHtml(expiryDate)}</p>
       </div>` +
      p(`Head to your dashboard to reveal and copy your login details.`),
    ctaLabel: "Open My Dashboard",
  });
}

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
  return brandShell({
    title: `Your ${productName} invite is on its way`,
    pill: "INVITE SENT",
    pillColor: "#22c55e",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(`We have sent your <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> team invite to:`) +
      `<div style="background-color:#0b0e14; border:1px dashed #22c55e; border-radius:12px; padding:18px; text-align:center; margin:0 0 20px 0;">
         <p style="margin:0; font-size:16px; font-family:monospace; font-weight:700; color:#22c55e;">${escapeHtml(inviteEmail)}</p>
       </div>` +
      p(`Open that inbox and accept the invite — premium switches on straight away, on your own account.`) +
      p(`<strong style="color:#ffffff;">Cannot find it?</strong> Check your spam and promotions folders.`) +
      p(`<span style="color:#64748b; font-size:12px;">Your subscription runs until ${escapeHtml(expiryDate)}.</span>`),
    ctaLabel: "View My Subscription",
  });
}

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
  return brandShell({
    title: daysLeft <= 1 ? "Your subscription expires tomorrow" : `${daysLeft} days left on your subscription`,
    pill: "RENEWAL REMINDER",
    pillBg: "rgba(245,158,11,0.12)",
    pillColor: "#f59e0b",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(
        `Your <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> subscription ends on <strong style="color:#ffffff;">${escapeHtml(expiryDate)}</strong>.`,
      ) +
      p(`Renew before then if you want to keep your access uninterrupted.`),
    ctaLabel: "Renew Subscription Now",
  });
}

export function getSubscriptionExpiredEmailHtml({
  customerName,
  productName,
}: {
  customerName: string;
  productName: string;
}) {
  return brandShell({
    title: "Your subscription has ended",
    pill: "EXPIRED",
    pillColor: "#9ca3af",
    body:
      p(`Hi ${escapeHtml(customerName)},`) +
      p(`Your <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> subscription has expired.`) +
      p(`Renewing takes a minute and you will get fresh access right away.`),
    ctaLabel: "Renew My Subscription",
  });
}
