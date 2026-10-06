import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const emailAddress = searchParams.get("email")?.toLowerCase().trim();

    const supabase = createAdminClient();

    if (emailAddress) {
      // Fetch received codes for specific generated/assigned email
      const { data: codes, error } = await supabase
        .from("received_email_codes")
        .select("*")
        .eq("email_address", emailAddress)
        .order("received_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching received codes:", error);
      }

      return NextResponse.json({
        success: true,
        email_address: emailAddress,
        codes: codes || [],
      });
    }

    // Otherwise fetch all assigned emails and passwords for current user
    const { data: genEmails } = await supabase
      .from("user_generated_emails")
      .select("id, user_id, email_address, prefix, password, service_name, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const emailsList = genEmails || [];
    const emailAddresses = emailsList.map((e) => e.email_address);

    let allCodes: any[] = [];
    if (emailAddresses.length > 0) {
      const { data: codes } = await supabase
        .from("received_email_codes")
        .select("*")
        .in("email_address", emailAddresses)
        .order("received_at", { ascending: false })
        .limit(30);

      allCodes = codes || [];
    }

    return NextResponse.json({
      success: true,
      assigned_emails: emailsList,
      accounts: emailsList,
      latest_codes: allCodes,
      codes: allCodes,
    });
  } catch (err: any) {
    console.error("Verifications fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch verifications" }, { status: 500 });
  }
}
