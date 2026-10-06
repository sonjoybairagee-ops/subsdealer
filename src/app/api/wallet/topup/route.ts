import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  amountBdt: z.number().min(50, "Minimum top-up is 50 BDT").max(50000, "Maximum top-up is 50,000 BDT"),
  method: z.enum(["bkash", "nagad"]),
  senderNumber: z.string().trim().min(8, "Valid mobile number is required").max(20),
  txnRef: z.string().trim().min(6, "Valid Transaction ID (TrxID) is required").max(50),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input data" },
      { status: 400 }
    );
  }

  const { amountBdt, method, senderNumber, txnRef } = parsed.data;
  const adminClient = createAdminClient();

  // Invoke atomic submit_wallet_topup function via service role client
  const { data: txn, error } = await adminClient.rpc("submit_wallet_topup", {
    p_user_id: user.id,
    p_amount_bdt: amountBdt,
    p_method: method,
    p_sender_number: senderNumber,
    p_txn_ref: txnRef,
  });

  if (error) {
    if (error.message.includes("MAX_PENDING_TOPUPS_EXCEEDED")) {
      return NextResponse.json(
        { error: "You already have 3 pending top-up requests under review. Please wait for verification." },
        { status: 409 }
      );
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This Transaction ID (TrxID) has already been submitted." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Top-up request submitted successfully!",
    transaction: txn,
  });
}
