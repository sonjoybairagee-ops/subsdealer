import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST: Admin approves top-up request and credits user wallet
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { topup_id, user_id, amount } = body;

    if ((!topup_id && !user_id) || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "topup_id (or user_id) and valid amount are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let targetUserId = user_id;
    let addAmount = Number(amount);

    // If topup_id provided, fetch and update topup status
    if (topup_id) {
      const { data: topup } = await supabase
        .from("wallet_topups")
        .select("*")
        .eq("id", topup_id)
        .maybeSingle();

      if (topup) {
        targetUserId = topup.user_id;
        addAmount = Number(topup.amount);
        await supabase.from("wallet_topups").update({ status: "approved" }).eq("id", topup_id);
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID not found for top-up" }, { status: 404 });
    }

    // Increment user's wallet_balance in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", targetUserId)
      .maybeSingle();

    const currentBalance = Number(profile?.wallet_balance || 0);
    const newBalance = currentBalance + addAmount;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance })
      .eq("id", targetUserId);

    if (updateErr) {
      console.error("Wallet balance update error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      new_balance: newBalance,
      message: `Successfully credited ৳${addAmount} to customer wallet. New balance: ৳${newBalance}`,
    });
  } catch (err: any) {
    console.error("Approve fund error:", err);
    return NextResponse.json({ error: err.message || "Failed to approve fund" }, { status: 500 });
  }
}
