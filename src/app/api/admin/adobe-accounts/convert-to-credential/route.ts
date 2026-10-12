import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { encryptCredential } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// POST: Convert an Adobe account from adobe_accounts to sub_credentials
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { adobe_account_id } = body;

    if (!adobe_account_id) {
      return NextResponse.json({ error: "Adobe account ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the Adobe account
    const { data: adobeAccount, error: adobeError } = await supabase
      .from("adobe_accounts")
      .select("*")
      .eq("id", adobe_account_id)
      .single();

    if (adobeError || !adobeAccount) {
      return NextResponse.json({ error: "Adobe account not found" }, { status: 404 });
    }

    // Check if already converted
    const { data: existingCred } = await supabase
      .from("sub_credentials")
      .select("id")
      .eq("login_email", adobeAccount.email)
      .maybeSingle();

    if (existingCred) {
      return NextResponse.json({ 
        success: true, 
        message: "Already converted to credential",
        credential_id: existingCred.id 
      });
    }

    // Encrypt the password
    const passwordEnc = encryptCredential(adobeAccount.password);

    // Create credential in sub_credentials table
    const { data: credential, error: credError } = await supabase
      .from("sub_credentials")
      .insert({
        login_email: adobeAccount.email,
        password_enc: passwordEnc,
        login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
        extra_notes: "Adobe Creative Cloud All Apps Account",
      })
      .select()
      .single();

    if (credError) {
      console.error("Error creating credential:", credError);
      return NextResponse.json({ error: "Failed to create credential" }, { status: 500 });
    }

    // Mark Adobe account as used
    await supabase
      .from("adobe_accounts")
      .update({ is_used: true })
      .eq("id", adobe_account_id);

    return NextResponse.json({
      success: true,
      message: "Adobe account converted to credential successfully!",
      credential: {
        id: credential.id,
        login_email: adobeAccount.email,
        login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
      },
    });
  } catch (err: any) {
    console.error("Convert Adobe account error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
