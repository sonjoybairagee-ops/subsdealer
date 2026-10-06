import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email query parameter is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    const { data: codes, error } = await supabase
      .from("email_verifications")
      .select("id, email_address, subject, code, received_at")
      .ilike("email_address", cleanEmail)
      .order("received_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Fetch OTPs error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      codes: codes || [],
    });
  } catch (err: any) {
    console.error("Portal fetch OTPs error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch OTPs" }, { status: 500 });
  }
}
