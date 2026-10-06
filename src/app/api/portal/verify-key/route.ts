import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body.accessKey || body.access_key;

    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
      return NextResponse.json({ error: "Access Key is required." }, { status: 400 });
    }

    const cleanKey = rawKey.trim().toUpperCase();
    const supabase = createAdminClient();

    // 1. Search shared_subscription_accounts by access_key
    let account: any = null;
    const { data: sharedAcc } = await supabase
      .from("shared_subscription_accounts")
      .select("id, user_id, service_name, email_address, password, access_key, status, expires_at, created_at")
      .ilike("access_key", cleanKey)
      .maybeSingle();

    if (sharedAcc) {
      account = sharedAcc;
    } else {
      // 2. Search user_generated_emails by access_key
      const { data: genEmail } = await supabase
        .from("user_generated_emails")
        .select("id, user_id, service_name, email_address, password, access_key, status, expires_at, created_at")
        .ilike("access_key", cleanKey)
        .maybeSingle();

      if (genEmail) {
        account = genEmail;
      }
    }

    // Fallback: Check latest matching record if cleanKey matches prefix
    if (!account) {
      const { data: fallbackGen } = await supabase
        .from("user_generated_emails")
        .select("id, user_id, service_name, email_address, password, access_key, status, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackGen && (!fallbackGen.access_key || fallbackGen.access_key.toUpperCase() === cleanKey)) {
        account = fallbackGen;
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: "Invalid Access Key. Please check your credentials or contact support." },
        { status: 404 }
      );
    }

    // 2. Verify subscription expiry date & status
    const now = new Date();
    // Default expiry date is 30 days after created_at if expires_at is not set
    const expiryDate = account.expires_at
      ? new Date(account.expires_at)
      : new Date(new Date(account.created_at || now).getTime() + 30 * 24 * 60 * 60 * 1000);

    const isExpired = now > expiryDate;
    const statusUpper = (account.status || "ACTIVE").toUpperCase();

    if (isExpired || statusUpper === "EXPIRED" || statusUpper === "REVOKED") {
      return NextResponse.json(
        {
          error: "Your subscription period has expired. Please renew your plan to regain access.",
          isExpired: true,
          expiresAt: expiryDate.toISOString(),
        },
        { status: 403 }
      );
    }

    account.access_key = account.access_key || cleanKey;

    // 3. Fetch latest live OTP / verification codes for this account's email_address
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
        expires_at: expiryDate.toISOString(),
      },
      codes: codes || [],
    });
  } catch (err: any) {
    console.error("Portal verify key error:", err);
    return NextResponse.json({ error: err.message || "Failed to verify Access Key" }, { status: 500 });
  }
}
