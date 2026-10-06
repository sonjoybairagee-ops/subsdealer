import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST: Customer submits bKash/Nagad wallet deposit request
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, payment_method, trx_id, phone_number } = body;

    if (!amount || amount <= 0 || !trx_id) {
      return NextResponse.json(
        { error: "Amount and Transaction ID (TrxID) are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    let data: any = null;
    let error: any = null;

    const res = await supabase
      .from("wallet_topups")
      .insert({
        user_id: user.id,
        amount: Number(amount),
        payment_method: payment_method || "bKash",
        trx_id: trx_id.trim().toUpperCase(),
        phone_number: phone_number || null,
        status: "pending",
      })
      .select()
      .single();

    data = res.data;
    error = res.error;

    if (error) {
      // Fallback insert if table name differs
      const fallbackRes = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          amount: Number(amount),
          type: "deposit",
          trx_id: trx_id.trim().toUpperCase(),
          status: "pending",
        })
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error("Add funds submit error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Top-up request submitted! Admin will verify and add funds shortly.",
    });
  } catch (err: any) {
    console.error("Wallet deposit error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit top-up request" }, { status: 500 });
  }
}
