import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTxnRef } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Customer-facing: submit a manual bKash payment for a subscription plan.
 *
 * Nothing is granted here. The order lands as 'pending' and an admin turns it
 * into a subscription through approve_sub_order.
 */

// bKash only for subscriptions. The sub_orders CHECK still allows 'nagad' and
// 'manual' so an admin can record one by hand later, but nothing the customer
// can reach will submit anything else.
const schema = z.object({
  planId: z.string().uuid(),
  method: z.literal("bkash"),
  txnRef: z.string().trim().min(1).max(40),
  senderNumber: z.string().trim().max(20).optional().nullable(),
  receiptPath: z.string().max(500).optional().nullable(),
  // Only used by invite-delivered products: the address we invite.
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
  const txnRef = parsed.data.txnRef.toUpperCase();
  const inviteEmail = parsed.data.inviteEmail?.toLowerCase() || null;

  if (!isValidTxnRef(txnRef)) {
    return NextResponse.json(
      {
        error:
          "That Transaction ID does not look right. It should be 8–12 characters with both letters and numbers.",
      },
      { status: 400 },
    );
  }

  // A receipt path must live under the uploader's own folder, otherwise
  // someone could point their order at another customer's upload.
  if (receiptPath && !receiptPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid receipt path" }, { status: 400 });
  }

  const svc = createAdminClient();

  // Read the price from the database, never from the request body.
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

  // An invite product is undeliverable without an address to invite, so this
  // is a hard requirement rather than something to chase the customer for later.
  if (product.delivery_type === "invite" && !inviteEmail) {
    return NextResponse.json(
      { error: `Please give us the email address of your ${product.name} account.` },
      { status: 400 },
    );
  }

  // One transaction ID, one order. The partial unique index enforces this too,
  // but catching it here gives the customer a sentence instead of a 500.
  const { data: duplicate } = await svc
    .from("sub_orders")
    .select("id")
    .eq("method", method)
    .ilike("txn_ref", txnRef)
    .in("status", ["pending", "on_hold", "approved"])
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { error: "This Transaction ID has already been submitted. Please wait for verification." },
      { status: 409 },
    );
  }

  // Don't let someone stack five pending orders for the same plan while
  // waiting on review — it just creates work and confusion for the admin.
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
          "You already have a payment under review for this plan. We will activate it shortly.",
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
      amount_bdt: plan.price_bdt,
      method,
      sender_number: senderNumber || null,
      txn_ref: txnRef,
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
    message: "Payment submitted. Your subscription will appear once we verify the transaction.",
  });
}
