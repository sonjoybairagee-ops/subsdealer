import "server-only";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends through Resend when RESEND_API_KEY is set, and quietly skips when it
 * is not — so local development and a fresh deploy both work without email
 * configured. Never throws: a failed notification must not roll back the
 * action that triggered it.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Subsdealer <onboarding@resend.dev>";

  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}
