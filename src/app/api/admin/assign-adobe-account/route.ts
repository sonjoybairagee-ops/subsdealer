import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { encryptCredential } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// POST: Assign an Adobe account to a subscription
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subscription_id, credential_id } = body;

    if (!subscription_id) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Option 1: Assign specific Adobe account by credential_id
    if (credential_id) {
      // Get the Adobe account from adobe_accounts table
      const { data: adobeAccount, error: adobeError } = await supabase
        .from("adobe_accounts")
        .select("*")
        .eq("id", credential_id)
        .single();

      if (adobeError || !adobeAccount) {
        return NextResponse.json({ error: "Adobe account not found" }, { status: 404 });
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*, sub_products(*)")
        .eq("id", subscription_id)
        .single();

      if (subError || !subscription) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }

      // Check if it's an Adobe product
      if (!subscription.sub_products.slug.includes("adobe")) {
        return NextResponse.json({ error: "This is not an Adobe subscription" }, { status: 400 });
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

      // Update subscription with credential_id
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ credential_id: credential.id })
        .eq("id", subscription_id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
      }

      // Mark Adobe account as used
      await supabase
        .from("adobe_accounts")
        .update({ is_used: true })
        .eq("id", credential_id);

      return NextResponse.json({
        success: true,
        message: "Adobe account assigned successfully!",
        credential: {
          id: credential.id,
          login_email: adobeAccount.email,
          login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
        },
      });
    }

    // Option 2: Auto-assign an available Adobe account
    // Get subscription details first
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, sub_products(*)")
      .eq("id", subscription_id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Check if it's an Adobe product
    if (!subscription.sub_products.slug.includes("adobe")) {
      return NextResponse.json({ error: "This is not an Adobe subscription" }, { status: 400 });
    }

    // Find an available Adobe account
    const { data: availableAccount, error: availError } = await supabase
      .from("adobe_accounts")
      .select("*")
      .eq("is_used", false)
      .limit(1)
      .single();

    if (availError || !availableAccount) {
      return NextResponse.json({ error: "No available Adobe accounts. Please generate more." }, { status: 404 });
    }

    // Encrypt the password
    const passwordEnc = encryptCredential(availableAccount.password);

    // Create credential in sub_credentials table
    const { data: credential, error: credError } = await supabase
      .from("sub_credentials")
      .insert({
        login_email: availableAccount.email,
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

    // Update subscription with credential_id
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ credential_id: credential.id })
      .eq("id", subscription_id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    // Mark Adobe account as used
    await supabase
      .from("adobe_accounts")
      .update({ is_used: true })
      .eq("id", availableAccount.id);

    return NextResponse.json({
      success: true,
      message: "Adobe account assigned successfully!",
      credential: {
        id: credential.id,
        login_email: availableAccount.email,
        login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
      },
    });
  } catch (err: any) {
    console.error("Admin assign Adobe account error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
