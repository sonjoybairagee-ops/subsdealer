import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const subscriptionId = body.subscription_id || body.subscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 });
    }

    // Call atomic renew_subscription RPC with admin service client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data, error: rpcError } = await adminSupabase.rpc("renew_subscription", {
      p_user_id: user.id,
      p_subscription_id: subscriptionId,
      p_window_days: 5,
    });

    if (rpcError) {
      const errorMsg = rpcError.message || "";
      if (errorMsg.includes("INSUFFICIENT_BALANCE")) {
        return NextResponse.json(
          { error: "Insufficient wallet balance. Please add funds to your wallet to renew." },
          { status: 400 }
        );
      }
      if (errorMsg.includes("NOT_EXPIRING_SOON")) {
        return NextResponse.json(
          { error: "Renewal is only available when 5 or fewer days remain on your subscription." },
          { status: 400 }
        );
      }
      if (errorMsg.includes("SUBSCRIPTION_NOT_FOUND")) {
        return NextResponse.json({ error: "Subscription not found or does not belong to you." }, { status: 404 });
      }
      return NextResponse.json({ error: rpcError.message || "Failed to renew subscription" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Subscription renewed successfully!",
      result: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process renewal" }, { status: 500 });
  }
}
