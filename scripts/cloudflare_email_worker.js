/**
 * Cloudflare Email Routing Worker for Subsdealer Portal
 * 
 * Paste this script into your Cloudflare Email Worker (dark-thunder-239c).
 * Uses 100% Native Cloudflare Email API - NO external modules or imports required!
 */

export default {
  async email(message, env, ctx) {
    try {
      // 1. Cloudflare Native Email Headers & Properties
      const recipient = message.to; // Destination email (e.g. user59832@portal.subsdealer.com)
      const sender = message.from;
      const subject = message.headers.get('subject') || 'Verification Code';

      // 2. Read raw email body text stream natively
      const rawText = await streamToString(message.raw);

      // 3. Extract 4 to 8 digit OTP / Verification code from subject or body text
      const fullText = `${subject} ${rawText}`;
      const otpMatch = fullText.match(/\b\d{4,8}\b/);
      const otpCode = otpMatch ? otpMatch[0] : 'N/A';

      // Clean up body content (first 1000 characters)
      const bodyContent = rawText
        .replace(/Content-Type:.*?\n/gi, '')
        .replace(/Content-Transfer-Encoding:.*?\n/gi, '')
        .replace(/--[a-zA-Z0-9_-]+/g, '')
        .trim()
        .substring(0, 1000);

      // 4. Prepare payload for Subsdealer Webhook API
      const webhookPayload = {
        secret: env.WEBHOOK_SECRET || '', // Token guard
        email_address: recipient,
        sender: sender,
        subject: subject,
        otp_code: otpCode,
        full_content: bodyContent || 'Email received',
      };

      // 5. Forward payload to Next.js Webhook Endpoint
      const response = await fetch('https://subsdealer.com/api/webhook/email-receiver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        console.error('Failed to forward email to Subsdealer Webhook API:', await response.text());
      } else {
        console.log(`Successfully forwarded OTP code [${otpCode}] for ${recipient}`);
      }
    } catch (err) {
      console.error('Error processing Cloudflare Email Worker:', err);
    }
  }
};

// Helper to convert ReadableStream to raw text string natively
async function streamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}
