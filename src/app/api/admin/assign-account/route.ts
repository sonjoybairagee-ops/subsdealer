import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Fetch all assigned accounts for Admin Overview
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch assigned accounts with customer profile details
    const [accountsRes, usersRes] = await Promise.all([
      supabase
        .from("user_generated_emails")
        .select("id, user_id, email_address, prefix, password, service_name, status, created_at, profiles(email, full_name)")
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
        .select("id, user_id, email_address, service_name, password, status, created_at, profiles(email, full_name)")
        .order("created_at", { ascending: false });
      sharedAccounts = data || [];
    } catch (e) {
      sharedAccounts = [];
    }

    // Combine records cleanly
    const listA = accountsRes.data || [];
    const listB = sharedAccounts;
    const combinedMap = new Map();

    listA.forEach((item: any) => combinedMap.set(item.email_address, item));
    listB.forEach((item: any) => {
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

// POST: Secure Admin Endpoint to Assign Email & Password to User
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_email, user_id: rawUserId, email_address, password, service_name, status } = body;

    if ((!user_email && !rawUserId) || !email_address || !password) {
      return NextResponse.json(
        { error: "Target User Email (or ID), Subscription Email Address, and Password are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let targetUserId = rawUserId;

    // If user_email is provided, lookup profile by email
    if (user_email && !targetUserId) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", user_email.trim())
        .maybeSingle();

      if (userProfile) {
        targetUserId = userProfile.id;
      } else {
        return NextResponse.json({ error: `User with email "${user_email}" not found.` }, { status: 404 });
      }
    }

    const cleanEmail = email_address.toLowerCase().trim();
    const cleanService = service_name || "Adobe Creative Cloud";
    const cleanStatus = status || "ACTIVE";
    const prefix = cleanEmail.split("@")[0] || "user";

    // Insert into user_generated_emails
    const { data: genData, error: genErr } = await supabase
      .from("user_generated_emails")
      .upsert(
        {
          user_id: targetUserId,
          email_address: cleanEmail,
          prefix,
          password,
          service_name: cleanService,
          status: cleanStatus,
        },
        { onConflict: "email_address" }
      )
      .select()
      .single();

    // Try inserting into shared_subscription_accounts
    try {
      await supabase.from("shared_subscription_accounts").upsert(
        {
          user_id: targetUserId,
          email_address: cleanEmail,
          password,
          service_name: cleanService,
          status: cleanStatus,
        },
        { onConflict: "email_address" }
      );
    } catch (e) {
      // ignore table optional error
    }

    if (genErr) {
      console.error("Assign account save error:", genErr);
      return NextResponse.json({ error: genErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: genData,
      message: "Subscription email and password assigned to user successfully!",
    });
  } catch (err: any) {
    console.error("Admin assign account POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to assign account" }, { status: 500 });
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
      await supabase.from("user_generated_emails").delete().eq("id", id);
      try {
        await supabase.from("shared_subscription_accounts").delete().eq("id", id);
      } catch (e) {}
    } else if (email) {
      await supabase.from("user_generated_emails").delete().eq("email_address", email.toLowerCase().trim());
      try {
        await supabase.from("shared_subscription_accounts").delete().eq("email_address", email.toLowerCase().trim());
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: "Account removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
