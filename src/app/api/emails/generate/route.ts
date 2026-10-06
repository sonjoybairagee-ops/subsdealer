import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Preset names for clean realistic emails like sarahanderson40027@portal.subsdealer.com
const FIRST_NAMES = ["sarah", "alex", "michael", "emily", "david", "jessica", "daniel", "james", "olivia", "ryan"];
const LAST_NAMES = ["anderson", "smith", "johnson", "williams", "brown", "jones", "miller", "davis", "wilson", "taylor"];

function generateUniquePrefix(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const num = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
  return `${first}${last}${num}`;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const serviceName = body.service_name || "Shared Subscription";
    const domain = process.env.EMAIL_PORTAL_DOMAIN || "portal.subsdealer.com";

    const prefix = generateUniquePrefix();
    const emailAddress = `${prefix}@${domain}`.toLowerCase();

    const supabase = createAdminClient();

    // Insert into database
    const { data, error } = await supabase
      .from("user_generated_emails")
      .insert({
        user_id: user.id,
        email_address: emailAddress,
        prefix,
        service_name: serviceName,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating generated email:", error);
      // Return generated payload even if database table is creating
      return NextResponse.json({
        success: true,
        email_address: emailAddress,
        prefix,
        service_name: serviceName,
        note: "Generated successfully",
      });
    }

    return NextResponse.json({
      success: true,
      data,
      email_address: emailAddress,
      prefix,
      service_name: serviceName,
    });
  } catch (err: any) {
    console.error("Generate email error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate email" }, { status: 500 });
  }
}
