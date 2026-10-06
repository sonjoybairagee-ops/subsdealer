import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { secret, email_address, sender, subject, otp_code, full_content } = body;

    // 1. Validate Webhook Secret if set in Environment Variables
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook call." }, { status: 401 });
    }

    if (!email_address) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const cleanEmail = email_address.trim().toLowerCase();
    const cleanSubject = subject || "Verification Code";
    const cleanOtp = otp_code || "N/A";
    const serviceName = cleanSubject.toLowerCase().includes("adobe")
      ? "Adobe Creative Cloud"
      : "Subscription Service";

    const supabase = createAdminClient();

    // 2. Primary Insert into otp_history table
    const { error: insertError } = await supabase.from("otp_history").insert({
      email_address: cleanEmail,
      service_name: serviceName,
      sender: sender || "",
      subject: cleanSubject,
      otp_code: cleanOtp,
      full_content: full_content || "",
      received_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Database insert error in otp_history:", insertError.message);
    }

    // 3. Fallback sync to email_verifications table for legacy endpoint compatibility
    try {
      await supabase.from("email_verifications").insert({
        email_address: cleanEmail,
        subject: cleanSubject,
        code: cleanOtp,
        received_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("email_verifications fallback insert warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: "OTP saved successfully!",
      email: cleanEmail,
      otp_code: cleanOtp,
    });
  } catch (err: any) {
    console.error("Webhook internal error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
