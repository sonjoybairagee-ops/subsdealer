/**
 * Cloudflare Email Worker for Subsdealer Portal (*@portal.subsdealer.com)
 * 
 * Instructions:
 * 1. Go to Cloudflare Dashboard -> Email Routing -> Destination Workers.
 * 2. Create a new Worker and paste this code.
 * 3. Under Email Routing -> Routing Rules, set Catch-All or Custom Rule to "Send to Worker" -> select this worker.
 */

export default {
  async email(message, env, ctx) {
    const to = message.to;
    const from = message.from;
    const subject = message.headers.get("subject") || "No Subject";

    // Read the email raw body as text
    const rawEmail = await new Response(message.raw).text();

    // Prepare JSON payload for Subsdealer Next.js Webhook
    const payload = {
      to: to,
      from: from,
      subject: subject,
      body: rawEmail,
      received_at: new Date().toISOString()
    };

    // Forward to Subsdealer Webhook API
    const webhookUrl = env.WEBHOOK_URL || "https://subsdealer.com/api/webhooks/inbound-email";

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Cloudflare-Email-Worker/1.0"
        },
        body: JSON.stringify(payload)
      });

      console.log(`Forwarded email ${to} to webhook. Status: ${response.status}`);
    } catch (err) {
      console.error(`Failed to forward email ${to}:`, err);
    }
  }
};
