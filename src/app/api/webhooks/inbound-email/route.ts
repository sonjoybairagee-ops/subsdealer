import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Regex-based Extractor for OTPs, Passwords, and Verification Links
 */
function extractEmailCodeContent(subject: string, bodyText: string): { code: string; type: string } {
  const combined = `${subject}\n${bodyText}`;

  // 1. Look for explicit "Verification code: 123456" or "Your code is 123456"
  const codeExplicitRegex = /(?:verification code|security code|login code|confirmation code|otp|your code|passcode|code is)[\s:]*([0-9]{4,8})/i;
  const explicitMatch = combined.match(codeExplicitRegex);
  if (explicitMatch && explicitMatch[1]) {
    return { code: explicitMatch[1], type: "otp" };
  }

  // 2. Look for Temporary Passwords (Adobe, Netflix, Canva)
  const passwordRegex = /(?:temporary password|your password|temp password|password is)[\s:]*([A-Za-z0-9!@#$%^&*_-]{6,20})/i;
  const passwordMatch = combined.match(passwordRegex);
  if (passwordMatch && passwordMatch[1]) {
    return { code: passwordMatch[1], type: "password" };
  }

  // 3. Look for standalone 6-digit or 4-digit numeric OTPs
  const digits6Regex = /\b([0-9]{6})\b/;
  const digits6Match = combined.match(digits6Regex);
  if (digits6Match && digits6Match[1]) {
    return { code: digits6Match[1], type: "otp" };
  }

  const digits4Regex = /\b([0-9]{4})\b/;
  const digits4Match = combined.match(digits4Regex);
  if (digits4Match && digits4Match[1]) {
    return { code: digits4Match[1], type: "otp" };
  }

  // 4. Look for Magic Verification Links
  const linkRegex = /(https?:\/\/[^\s"']*(?:verify|confirm|login|auth|otp|token)[^\s"']*)/i;
  const linkMatch = combined.match(linkRegex);
  if (linkMatch && linkMatch[1]) {
    return { code: linkMatch[1], type: "link" };
  }

  // Fallback: Return first 100 characters of subject or body if no specific OTP found
  return { code: subject.slice(0, 50) || "Check Email Body", type: "text" };
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Support multiple webhook payload formats (Cloudflare Email Worker, SendGrid, Mailgun, Postmark)
    const recipientRaw = payload.to || payload.recipient || payload.email || payload.to_address || "";
    const sender = payload.from || payload.sender || payload.from_address || "Unknown Sender";
    const subject = payload.subject || "No Subject";
    const bodyText = payload.body || payload.text || payload.html || payload.raw_body || "";

    // Clean recipient email address (extract email inside <...>)
    const emailMatch = recipientRaw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const recipientEmail = (emailMatch ? emailMatch[1] : recipientRaw).toLowerCase().trim();

    if (!recipientEmail) {
      return NextResponse.json({ error: "Missing recipient email address" }, { status: 400 });
    }

    // Extract OTP / Password / Link using regex parser
    const { code, type } = extractEmailCodeContent(subject, bodyText);

    const supabase = createAdminClient();

    // Find linked user_generated_emails row
    const { data: genEmail } = await supabase
      .from("user_generated_emails")
      .select("id, user_id, email_address")
      .eq("email_address", recipientEmail)
      .single();

    // Insert received code into received_email_codes, otp_history, and email_verifications tables
    const { data: inserted, error: insertErr } = await supabase
      .from("received_email_codes")
      .insert({
        generated_email_id: genEmail ? genEmail.id : null,
        email_address: recipientEmail,
        sender,
        subject,
        code,
        otp_type: type,
        raw_body: bodyText.slice(0, 2000), // Limit length
      })
      .select()
      .single();

    // Also insert into otp_history table for admin logs
    try {
      await supabase.from("otp_history").insert({
        email_address: recipientEmail,
        service_name: "Adobe Creative Cloud",
        sender,
        subject,
        otp_code: code,
        full_content: bodyText.slice(0, 2000),
      });
    } catch (e) {}

    // Also insert into email_verifications table for user portal
    try {
      await supabase.from("email_verifications").insert({
        email_address: recipientEmail,
        subject,
        code,
      });
    } catch (e) {}

    if (insertErr) {
      console.error("Error storing received email code:", insertErr);
    }

    return NextResponse.json({
      success: true,
      email_address: recipientEmail,
      extracted_code: code,
      extracted_type: type,
      inserted: inserted || null,
    });
  } catch (err: any) {
    console.error("Inbound email webhook error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
