import { createAdminClient } from "@/lib/supabase/admin";

interface WhatsAppSendOptions {
  userId?: string;
  phone: string;
  eventType: "order_approved" | "fund_approved" | "subscription_expiring";
  referenceId?: string;
  messageText: string;
  payload?: any;
}

/**
 * Normalizes phone numbers to E.164 format (+880...)
 */
export function normalizePhoneE164(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("01")) {
    cleaned = "+88" + cleaned;
  } else if (cleaned.startsWith("8801")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

/**
 * Non-blocking WhatsApp Notification Dispatcher.
 * Fires asynchronously with a 3.5s timeout. Never throws errors to block main transaction.
 */
export async function sendWhatsAppNotification(options: WhatsAppSendOptions): Promise<void> {
  const { userId, phone, eventType, referenceId, messageText, payload } = options;

  if (!phone) return;

  const normalizedPhone = normalizePhoneE164(phone);
  const supabase = createAdminClient();

  // Create audit log record in whatsapp_logs
  let logId: string | null = null;
  try {
    const { data: log } = await supabase
      .from("whatsapp_logs")
      .insert({
        user_id: userId || null,
        phone: normalizedPhone,
        event_type: eventType,
        reference_id: referenceId || null,
        payload: { messageText, ...(payload || {}) },
        status: "pending",
        attempts: 1,
      })
      .select("id")
      .maybeSingle();

    if (log) logId = log.id;
  } catch (logErr) {
    console.warn("Failed to create whatsapp_log entry:", logErr);
  }

  // Attempt non-blocking HTTP dispatch to WhatsApp API provider (e.g. UltraMsg / Greenweb / Custom Webhook)
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || process.env.WHATSAPP_API_URL;

  if (!webhookUrl) {
    // If no external gateway configured, log as simulated sent
    console.log(`[WhatsApp Simulated Sent] To: ${normalizedPhone} | Msg: ${messageText}`);
    if (logId) {
      await supabase
        .from("whatsapp_logs")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", logId);
    }
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout guard

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        phone: normalizedPhone,
        message: messageText,
        event_type: eventType,
        reference_id: referenceId,
      }),
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      if (logId) {
        await supabase
          .from("whatsapp_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", logId);
      }
    } else {
      const errText = await res.text().catch(() => "HTTP Error");
      if (logId) {
        await supabase
          .from("whatsapp_logs")
          .update({ status: "failed", error: errText })
          .eq("id", logId);
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errorMsg = err.name === "AbortError" ? "Timeout after 3.5s" : err.message;
    console.warn("[WhatsApp Dispatch Warning]:", errorMsg);

    if (logId) {
      await supabase
        .from("whatsapp_logs")
        .update({ status: "failed", error: errorMsg })
        .eq("id", logId);
    }
  }
}
