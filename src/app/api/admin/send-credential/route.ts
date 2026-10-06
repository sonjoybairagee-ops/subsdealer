import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      target_customer_email,
      service_name,
      email_address,
      password,
      access_key,
      customer_phone: rawPhone,
    } = body;

    if (!target_customer_email || !access_key) {
      return NextResponse.json({ error: "Missing required credentials data." }, { status: 400 });
    }

    const serviceName = service_name || "Subscription Service";
    const portalLink = "https://subsdealer.com/portal";

    // Lookup customer profile for phone if not passed directly
    let finalPhone = rawPhone || "";
    let customerName = "Valued Customer";

    try {
      const supabase = createAdminClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .ilike("email", target_customer_email.trim())
        .maybeSingle();

      if (profile) {
        if (profile.full_name) customerName = profile.full_name;
        if (!finalPhone && profile.phone) finalPhone = profile.phone;
      }
    } catch (e) {
      console.warn("Profile lookup warning in send-credential:", e);
    }

    const textContent = `
🎉 Hello ${customerName}! Your ${serviceName} Subscription Access is Ready!
--------------------------------------------
📧 Email: ${email_address}
🔑 Password: ${password}
🔐 Unique Access Key: ${access_key}
--------------------------------------------
👉 Access your portal & live OTP here: ${portalLink}
⚠️ Please do not share your access key or change account credentials.
    `.trim();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0d12; color: #ffffff; padding: 24px; borderRadius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="color: #ef4444; margin-top: 0;">🎉 Your ${serviceName} Subscription is Ready!</h2>
        <p style="color: #a3a3a3; font-size: 14px;">Hello ${customerName}, your subscription account has been successfully assigned.</p>
        
        <div style="background-color: #161922; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; margin: 20px 0;">
          <p style="margin: 6px 0; font-size: 13px;"><strong>📧 Subscription Email:</strong> <span style="color: #f87171; font-family: monospace;">${email_address}</span></p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>🔑 Password:</strong> <span style="color: #fbbf24; font-family: monospace;">${password}</span></p>
          <p style="margin: 6px 0; font-size: 13px;"><strong>🔐 Unique Access Key:</strong> <span style="color: #34d399; font-family: monospace; font-weight: bold; background: rgba(52,211,153,0.1); padding: 2px 8px; border-radius: 4px;">${access_key}</span></p>
        </div>

        <p style="text-align: center; margin: 24px 0;">
          <a href="${portalLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">👉 Access Live OTP Portal →</a>
        </p>

        <p style="font-size: 11px; color: #737373; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          ⚠️ Please do not share your access key or change account credentials.
        </p>
      </div>
    `;

    // 1. Send Email Notification
    const emailSent = await sendEmail({
      to: target_customer_email.trim(),
      subject: `🎉 Your ${serviceName} Access Details & Portal Key`,
      html: htmlContent,
    });

    // 2. Send WhatsApp Notification if phone is available
    if (finalPhone) {
      await sendWhatsAppNotification({
        phone: finalPhone,
        eventType: "order_approved",
        messageText: textContent,
        payload: { access_key, service_name, target_customer_email },
      });
    }

    return NextResponse.json({
      success: true,
      emailSent,
      whatsAppSent: Boolean(finalPhone),
      message: "Access Key and credentials notification dispatched successfully!",
    });
  } catch (err: any) {
    console.error("Failed to send notification:", err);
    return NextResponse.json({ error: err.message || "Failed to send notification" }, { status: 500 });
  }
}
