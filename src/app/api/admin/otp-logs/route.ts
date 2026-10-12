import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const allLogs: any[] = [];
    const seenKeys = new Set<string>();

    // Helper to safely format and push log items
    const addLog = (item: { id?: string; email_address?: string; service_name?: string; subject?: string; otp_code?: string; received_at?: string }) => {
      if (!item.email_address) return;
      const key = `${item.email_address.toLowerCase()}_${item.otp_code || item.subject}_${new Date(item.received_at || Date.now()).getTime()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allLogs.push({
          id: item.id || Math.random().toString(),
          email_address: item.email_address,
          service_name: item.service_name || "Subscription Service",
          subject: item.subject || "Verification Code",
          otp_code: item.otp_code || "N/A",
          received_at: item.received_at || new Date().toISOString(),
        });
      }
    };

    // 1. Fetch from otp_history table
    try {
      const { data: primaryLogs } = await supabase
        .from("otp_history")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50);
      if (primaryLogs && primaryLogs.length > 0) {
        primaryLogs.forEach((item: any) => addLog(item));
      }
    } catch (e) {}

    // 2. Fetch from received_email_codes table
    try {
      const { data: codeLogs } = await supabase
        .from("received_email_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (codeLogs && codeLogs.length > 0) {
        codeLogs.forEach((item: any) =>
          addLog({
            id: item.id,
            email_address: item.email_address,
            service_name: "Service Verification",
            subject: item.subject,
            otp_code: item.code,
            received_at: item.created_at || item.received_at,
          })
        );
      }
    } catch (e) {}

    // 3. Fetch from email_verifications table
    try {
      const { data: fallbackLogs } = await supabase
        .from("email_verifications")
        .select("id, email_address, subject, code, received_at")
        .order("received_at", { ascending: false })
        .limit(50);
      if (fallbackLogs && fallbackLogs.length > 0) {
        fallbackLogs.forEach((item: any) =>
          addLog({
            id: item.id,
            email_address: item.email_address,
            service_name: "Subscription Service",
            subject: item.subject || "Verification Code",
            otp_code: item.code,
            received_at: item.received_at,
          })
        );
      }
    } catch (e) {}

    // Sort combined logs by timestamp descending
    allLogs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

    return NextResponse.json({
      success: true,
      logs: allLogs,
    });
  } catch (err: any) {
    console.error("Admin OTP logs GET error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
