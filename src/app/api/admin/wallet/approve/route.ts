import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  transactionId: z.string().uuid("Valid transactionId is required"),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  const { transactionId, action, reason } = parsed.data;
  const adminClient = createAdminClient();

  if (action === "approve") {
    const { data, error } = await adminClient.rpc("approve_wallet_topup", {
      p_transaction_id: transactionId,
      p_admin_id: adminProfile.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Top-up approved successfully", transaction: data });
  } else {
    const { data, error } = await adminClient.rpc("reject_wallet_topup", {
      p_transaction_id: transactionId,
      p_admin_id: adminProfile.id,
      p_reason: reason || "Top-up request rejected by admin.",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Top-up rejected successfully", transaction: data });
  }
}
