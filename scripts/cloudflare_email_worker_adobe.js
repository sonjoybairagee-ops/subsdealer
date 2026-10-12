/**
 * Cloudflare Email Routing Worker for Subsdealer - Adobe OTP Receiver
 * 
 * This worker receives emails sent to @subsdealer.com domain and forwards OTP codes
 * to the backend webhook API for storage in the database.
 * 
 * Setup:
 * 1. Create a Cloudflare Email Worker
 * 2. Set environment variable: WEBHOOK_SECRET (your secret token)
 * 3. Configure email routing to send all emails to this worker
 * 4. Update the webhook URL to your production domain
 */

export default {
  async email(message, env, ctx) {
    try {
      // 1. Extract email metadata
      const recipient = message.to; // Destination email (e.g., adobe_abc123@subsdealer.com)
      const sender = message.from;
      const subject = message.headers.get('subject') || 'Verification Code';

      // 2. Read raw email body text stream
      const rawText = await streamToString(message.raw);

      // 3. Extract OTP/Verification code with multiple patterns
      const fullText = `${subject} ${rawText}`;
      
      // Pattern 1: 6-digit code (most common)
      let otpMatch = fullText.match(/\b\d{6}\b/);
      
      // Pattern 2: 4-8 digit code
      if (!otpMatch) {
        otpMatch = fullText.match(/\b\d{4,8}\b/);
      }
      
      // Pattern 3: "code:" or "verification code:" followed by digits
      if (!otpMatch) {
        otpMatch = fullText.match(/code[:\s]+([0-9]{4,8})/i);
      }
      
      // Pattern 4: "your code is" followed by digits
      if (!otpMatch) {
        otpMatch = fullText.match(/your code is[:\s]+([0-9]{4,8})/i);
      }
      
      const otpCode = otpMatch ? (otpMatch[1] || otpMatch[0]) : 'N/A';

      // Clean up body content (remove headers, keep only email body)
      const bodyContent = rawText
        .replace(/Content-Type:.*?\n/gi, '')
        .replace(/Content-Transfer-Encoding:.*?\n/gi, '')
        .replace(/Content-Disposition:.*?\n/gi, '')
        .replace(/--[a-zA-Z0-9_-]+/g, '')
        .replace(/boundary=.*?\n/gi, '')
        .trim()
        .substring(0, 2000); // Increased to 2000 chars for better context

      // 4. Determine service name from subject or sender
      let serviceName = 'Subscription Service';
      const lowerSubject = subject.toLowerCase();
      const lowerSender = sender.toLowerCase();
      
      if (lowerSubject.includes('adobe') || lowerSender.includes('adobe')) {
        serviceName = 'Adobe Creative Cloud';
      } else if (lowerSubject.includes('canva') || lowerSender.includes('canva')) {
        serviceName = 'Canva';
      } else if (lowerSubject.includes('spotify') || lowerSender.includes('spotify')) {
        serviceName = 'Spotify';
      } else if (lowerSubject.includes('netflix') || lowerSender.includes('netflix')) {
        serviceName = 'Netflix';
      }

      // 5. Prepare payload for Subsdealer Webhook API
      const webhookPayload = {
        secret: env.WEBHOOK_SECRET || '', // Token guard for security
        email_address: recipient,
        sender: sender,
        subject: subject,
        otp_code: otpCode,
        service_name: serviceName,
        full_content: bodyContent || 'Email received',
        received_at: new Date().toISOString()
      };

      // 6. Forward payload to Next.js Webhook Endpoint
      // Update this URL to your production domain
      const webhookUrl = env.WEBHOOK_URL || 'https://subsdealer.com/api/webhook/email-receiver';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Email-Worker/1.0'
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to forward email to webhook: ${response.status} ${errorText}`);
        
        // Log failed attempt for debugging
        console.error('Payload that failed:', JSON.stringify(webhookPayload, null, 2));
      } else {
        console.log(`✓ Successfully forwarded OTP [${otpCode}] for ${recipient} (${serviceName})`);
      }
    } catch (err) {
      console.error('Error processing Cloudflare Email Worker:', err);
      console.error('Error details:', err.message);
    }
  }
};

// Helper to convert ReadableStream to raw text string
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
