import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper to generate a unique random access key (e.g. ADOBE-9A2F8B-4819)
function generateAccessKey(serviceName: string) {
  const prefix = serviceName.toUpperCase().includes("ADOBE") ? "ADOBE" : "SUB";
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomStr}-${randomDigits}`;
}

// GET: Fetch all assigned accounts for Admin Overview
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [accountsRes, usersRes] = await Promise.all([
      supabase
        .from("user_generated_emails")
        .select("id, user_id, email_address, prefix, password, service_name, access_key, status, expires_at, created_at, profiles(email, full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("created_at", { ascending: false }),
    ]);

    let sharedAccounts: any[] = [];
    try {
      const { data } = await supabase
        .from("shared_subscription_accounts")
        .select("id, user_id, target_customer_email, email_address, service_name, password, access_key, status, expires_at, created_at, profiles(email, full_name)")
        .order("created_at", { ascending: false });
      sharedAccounts = data || [];
    } catch (e) {
      sharedAccounts = [];
    }

    const combinedMap = new Map();
    (accountsRes.data || []).forEach((item: any) => combinedMap.set(item.email_address, item));
    sharedAccounts.forEach((item: any) => {
      if (!combinedMap.has(item.email_address)) {
        combinedMap.set(item.email_address, item);
      }
    });

    return NextResponse.json({
      success: true,
      accounts: Array.from(combinedMap.values()),
      users: usersRes.data || [],
    });
  } catch (err: any) {
    console.error("Admin assign account GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch assigned accounts" }, { status: 500 });
  }
}

// POST: Backend API for Assigning & Storing Accounts with Unique Access Key & Expiry Date
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCustomerEmail = body.target_customer_email || body.user_email;
    const { email_address, password, service_name, status, duration_days } = body;

    if (!targetCustomerEmail || !email_address || !password) {
      return NextResponse.json(
        { error: "Target customer email, subscription email address, and password are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const cleanCustomerEmail = targetCustomerEmail.trim();
    let targetUserId: string | null = null;

    // Lookup user profile by email if existing
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", cleanCustomerEmail)
      .maybeSingle();

    if (userProfile) {
      targetUserId = userProfile.id;
    }

    const cleanSubEmail = email_address.toLowerCase().trim();
    const cleanServiceName = service_name || "Adobe Creative Cloud";
    const cleanStatus = status || "active";
    const accessKey = generateAccessKey(cleanServiceName);
    const prefix = cleanSubEmail.split("@")[0] || "user";

    const daysToAdd = Number(duration_days) || 30;
    const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert/upsert into shared_subscription_accounts
    const { data: accountData, error: accountErr } = await supabase
      .from("shared_subscription_accounts")
      .upsert(
        {
          user_id: targetUserId,
          target_customer_email: cleanCustomerEmail,
          service_name: cleanServiceName,
          email_address: cleanSubEmail,
          password,
          access_key: accessKey,
          status: cleanStatus,
          expires_at: expiresAt,
        },
        { onConflict: "email_address" }
      )
      .select()
      .single();

    if (accountErr) {
      console.error("Error inserting into shared_subscription_accounts:", accountErr);
    }

    // 2. Also sync to user_generated_emails for fallback compatibility
    try {
      await supabase.from("user_generated_emails").upsert(
        {
          user_id: targetUserId,
          email_address: cleanSubEmail,
          prefix,
          password,
          service_name: cleanServiceName,
          access_key: accessKey,
          status: cleanStatus,
          expires_at: expiresAt,
        },
        { onConflict: "email_address" }
      );
    } catch (e) {
      console.warn("user_generated_emails sync warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Account successfully assigned and access key generated!",
      access_key: accessKey,
      expires_at: expiresAt,
      account: accountData || {
        target_customer_email: cleanCustomerEmail,
        service_name: cleanServiceName,
        email_address: cleanSubEmail,
        password,
        access_key: accessKey,
        status: cleanStatus,
        expires_at: expiresAt,
      },
    });
  } catch (err: any) {
    console.error("Admin assign account POST error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Extend Validity (+30 days) or Reset / Expire Subscription Account
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, email_address, action, extend_days } = body;

    if (!id && !email_address) {
      return NextResponse.json({ error: "Account ID or Email is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = (email_address || "").toLowerCase().trim();

    if (action === "extend") {
      const days = Number(extend_days) || 30;
      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      if (id) {
        await supabase
          .from("shared_subscription_accounts")
          .update({ expires_at: newExpiry, status: "active" })
          .eq("id", id);
      } else {
        await supabase
          .from("shared_subscription_accounts")
          .update({ expires_at: newExpiry, status: "active" })
          .eq("email_address", cleanEmail);
      }

      try {
        await supabase.from("user_generated_emails").update({ expires_at: newExpiry, status: "active" }).eq("email_address", cleanEmail);
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Subscription extended by ${days} days!`, new_expires_at: newExpiry });
    } else if (action === "expire" || action === "revoke") {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      if (id) {
        await supabase
          .from("shared_subscription_accounts")
          .update({ status: "expired", expires_at: pastDate })
          .eq("id", id);
      } else {
        await supabase
          .from("shared_subscription_accounts")
          .update({ status: "expired", expires_at: pastDate })
          .eq("email_address", cleanEmail);
      }

      try {
        await supabase.from("user_generated_emails").update({ status: "expired", expires_at: pastDate }).eq("email_address", cleanEmail);
      } catch (e) {}

      return NextResponse.json({ success: true, message: "Subscription marked as EXPIRED/REVOKED." });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update subscription status" }, { status: 500 });
  }
}

// DELETE: Remove an assigned subscription account
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (!id && !email) {
      return NextResponse.json({ error: "ID or Email required for deletion" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (id) {
      await supabase.from("shared_subscription_accounts").delete().eq("id", id);
      try {
        await supabase.from("user_generated_emails").delete().eq("id", id);
      } catch (e) {}
    } else if (email) {
      await supabase.from("shared_subscription_accounts").delete().eq("email_address", email.toLowerCase().trim());
      try {
        await supabase.from("user_generated_emails").delete().eq("email_address", email.toLowerCase().trim());
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: "Account removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
