import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Primary Query: Fetch from otp_history table
    let logs: any[] = [];
    const { data: primaryLogs, error: primaryErr } = await supabase
      .from("otp_history")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50);

    if (!primaryErr && primaryLogs && primaryLogs.length > 0) {
      logs = primaryLogs;
    } else {
      // 2. Fallback Query: Fetch from email_verifications table
      const { data: fallbackLogs } = await supabase
        .from("email_verifications")
        .select("id, email_address, subject, code, received_at")
        .order("received_at", { ascending: false })
        .limit(50);

      if (fallbackLogs) {
        logs = fallbackLogs.map((item: any) => ({
          id: item.id,
          email_address: item.email_address,
          service_name: "Adobe Creative Cloud",
          subject: item.subject || "Verification Code",
          otp_code: item.code,
          received_at: item.received_at,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (err: any) {
    console.error("Admin OTP logs GET error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
