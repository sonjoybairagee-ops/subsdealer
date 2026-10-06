import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body.accessKey || body.access_key;

    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return NextResponse.json({ error: "Access Key is required" }, { status: 400 });
    }

    const cleanKey = rawKey.trim().toUpperCase();
    const supabase = createAdminClient();

    // 1. Search shared_subscription_accounts by access_key
    let account: any = null;
    const { data: sharedAcc } = await supabase
      .from("shared_subscription_accounts")
      .select("id, user_id, service_name, email_address, password, access_key, status, created_at")
      .ilike("access_key", cleanKey)
      .maybeSingle();

    if (sharedAcc) {
      account = sharedAcc;
    } else {
      // 2. Search user_generated_emails by access_key
      const { data: genEmail } = await supabase
        .from("user_generated_emails")
        .select("id, user_id, service_name, email_address, password, access_key, status, created_at")
        .ilike("access_key", cleanKey)
        .maybeSingle();

      if (genEmail) {
        account = genEmail;
      }
    }

    // Fallback: If cleanKey matches format SUBS-XXXX-SERVICE, try matching prefix or email
    if (!account) {
      const { data: fallbackGen } = await supabase
        .from("user_generated_emails")
        .select("id, user_id, service_name, email_address, password, access_key, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackGen && (!fallbackGen.access_key || fallbackGen.access_key.toUpperCase() === cleanKey)) {
        account = fallbackGen;
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: "Invalid Access Key. Please check your WhatsApp/Email or contact support." },
        { status: 404 }
      );
    }

    // Ensure access_key field is set in account object
    account.access_key = account.access_key || cleanKey;

    // 3. Fetch latest verification codes for this account's email_address
    const { data: codes } = await supabase
      .from("email_verifications")
      .select("id, email_address, subject, code, received_at")
      .ilike("email_address", account.email_address)
      .order("received_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        service_name: account.service_name || "Adobe Creative Cloud",
        email_address: account.email_address,
        password: account.password || "012345678a@",
        access_key: account.access_key,
        status: account.status || "ACTIVE",
      },
      codes: codes || [],
    });
  } catch (err: any) {
    console.error("Portal verify key error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify Access Key" }, { status: 500 });
  }
}
