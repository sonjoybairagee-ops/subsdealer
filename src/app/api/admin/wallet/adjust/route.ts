import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid("Valid userId is required"),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be 0"),
  note: z.string().trim().min(3, "Adjustment note is required"),
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

  const { userId, amount, note } = parsed.data;
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc("admin_adjust_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_note: note,
    p_admin_id: adminProfile.id,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_FUNDS_FOR_DEBIT")) {
      return NextResponse.json({ error: "User balance cannot become negative." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Wallet balance adjusted successfully", transaction: data });
}
