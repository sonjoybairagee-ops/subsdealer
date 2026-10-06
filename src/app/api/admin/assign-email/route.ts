import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Fetch all assigned emails and user list for Admin Panel
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const [emailsRes, usersRes] = await Promise.all([
      supabase
        .from("user_generated_emails")
        .select("id, user_id, email_address, prefix, password, service_name, status, created_at, profiles(email, full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, email, full_name").order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      assigned_emails: emailsRes.data || [],
      users: usersRes.data || [],
    });
  } catch (err: any) {
    console.error("Admin assign email GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch" }, { status: 500 });
  }
}

// POST: Admin Assign Email & Password to specific User
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, email_address, password, service_name, status } = body;

    if (!user_id || !email_address || !password) {
      return NextResponse.json(
        { error: "User ID, Email Address, and Password are required" },
        { status: 400 }
      );
    }

    const prefix = email_address.split("@")[0] || "user";
    const supabase = createAdminClient();

    // Check if email already assigned or update existing
    const { data: existing } = await supabase
      .from("user_generated_emails")
      .select("id")
      .eq("email_address", email_address.toLowerCase().trim())
      .maybeSingle();

    let resultData;
    let resultErr;

    if (existing) {
      const { data, error } = await supabase
        .from("user_generated_emails")
        .update({
          user_id,
          password,
          service_name: service_name || "Adobe Creative Cloud",
          status: status || "NEW",
        })
        .eq("id", existing.id)
        .select()
        .single();
      resultData = data;
      resultErr = error;
    } else {
      const { data, error } = await supabase
        .from("user_generated_emails")
        .insert({
          user_id,
          email_address: email_address.toLowerCase().trim(),
          prefix,
          password,
          service_name: service_name || "Adobe Creative Cloud",
          status: status || "NEW",
        })
        .select()
        .single();
      resultData = data;
      resultErr = error;
    }

    if (resultErr) {
      console.error("Assign email save error:", resultErr);
      return NextResponse.json({ error: resultErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: resultData,
      message: "Email & Password assigned to user successfully!",
    });
  } catch (err: any) {
    console.error("Admin assign email POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to assign email" }, { status: 500 });
  }
}

// DELETE: Remove assigned account
export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("user_generated_emails").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
