import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTxnRef } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Customer-facing: submit a payment or claim a promotional free subscription.
 *
 * Server-side Security:
 * - Actual plan price is ALWAYS fetched directly from Supabase DB by planId.
 * - Client parameters cannot bypass payment validation.
 * - 0 BDT plans enforce 1 free claim per user per product.
 */

const schema = z.object({
  planId: z.string().uuid(),
  method: z.literal("bkash"),
  txnRef: z.string().trim().max(40).optional().nullable(),
  senderNumber: z.string().trim().max(20).optional().nullable(),
  receiptPath: z.string().max(500).optional().nullable(),
  inviteEmail: z.string().trim().email().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order data" },
      { status: 400 },
    );
  }
  const { planId, method, receiptPath, senderNumber } = parsed.data;
  const inviteEmail = parsed.data.inviteEmail?.toLowerCase() || null;

  // A receipt path must live under the uploader's own folder
  if (receiptPath && !receiptPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 });
  }

  const svc = createAdminClient();

  // 1. Fetch ACTUAL plan and product data from Supabase DB (never trust client)
  const { data: plan } = await svc
    .from("sub_plans")
    .select("id, product_id, name, price_bdt, duration_days, is_active, sub_products(name, slug, is_active, delivery_type)")
    .eq("id", planId)
    .maybeSingle();

  if (!plan || !plan.is_active) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const product = (plan as any).sub_products;
  if (!product?.is_active) {
    return NextResponse.json({ error: "This product is not on sale right now." }, { status: 404 });
  }

  // Invite delivery requirement
  if (product.delivery_type === "invite" && !inviteEmail) {
    return NextResponse.json(
      { error: `Please give us the email address of your ${product.name} account.` },
      { status: 400 },
    );
  }

  const dbPrice = Number(plan.price_bdt);
  const isFreePlan = dbPrice === 0;

  let finalTxnRef = "";

  if (isFreePlan) {
    // 2. Free Claim Abuse Prevention: Enforce 1 free claim per user per product
    const { data: existingFreeClaim } = await svc
      .from("sub_orders")
      .select("id, sub_plans!inner(price_bdt)")
      .eq("user_id", user.id)
      .eq("product_id", plan.product_id)
      .eq("sub_plans.price_bdt", 0)
      .in("status", ["pending", "on_hold", "approved", "completed"])
      .limit(1)
      .maybeSingle();

    if (existingFreeClaim) {
      return NextResponse.json(
        { error: `🎁 You have already claimed a free promotion for ${product.name}.` },
        { status: 409 },
      );
    }

    // Server generates a crypto-secure reference for free claims
    finalTxnRef = `FREE-CLAIM-${randomBytes(3).toString("hex").toUpperCase()}`;
  } else {
    // 3. Paid Plan Validation
    const clientTxnRef = (parsed.data.txnRef || "").trim().toUpperCase();

    // Reject fake FREE- references or invalid bKash transaction IDs on paid plans
    if (clientTxnRef.startsWith("FREE-") || !isValidTxnRef(clientTxnRef)) {
      return NextResponse.json(
        {
          error:
            "That Transaction ID does not look right. It should be 8–12 characters with both letters and numbers.",
        },
        { status: 400 },
      );
    }

    // Check for duplicate transaction ID
    const { data: duplicate } = await svc
      .from("sub_orders")
      .select("id")
      .eq("method", method)
      .ilike("txn_ref", clientTxnRef)
      .in("status", ["pending", "on_hold", "approved"])
      .limit(1)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { error: "This Transaction ID has already been submitted. Please wait for verification." },
        { status: 409 },
      );
    }

    finalTxnRef = clientTxnRef;
  }

  // Prevent duplicate pending orders for the exact same plan
  const { data: alreadyPending } = await svc
    .from("sub_orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_id", planId)
    .in("status", ["pending", "on_hold"])
    .limit(1)
    .maybeSingle();

  if (alreadyPending) {
    return NextResponse.json(
      {
        error:
          "You already have a payment or claim under review for this plan. We will activate it shortly.",
      },
      { status: 409 },
    );
  }

  const { data: order, error } = await svc
    .from("sub_orders")
    .insert({
      user_id: user.id,
      product_id: plan.product_id,
      plan_id: plan.id,
      amount_bdt: dbPrice,
      method,
      sender_number: senderNumber || null,
      txn_ref: finalTxnRef,
      receipt_path: receiptPath || null,
      invite_email: inviteEmail,
      status: "pending",
    })
    .select("id, status, amount_bdt, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This Transaction ID has already been submitted." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    order,
    product: product.name,
    plan: plan.name,
    message: isFreePlan
      ? "🎁 Free claim submitted! Your subscription will be activated shortly."
      : "Payment submitted. Your subscription will appear once we verify the transaction.",
  });
}
