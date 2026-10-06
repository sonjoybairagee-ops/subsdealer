import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { getSubscriptionReadyEmailHtml } from "@/lib/emails/subscriptionTemplates";
import { formatDhakaDate } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Turn a verified bKash payment into a live subscription.
 *
 * The state change itself happens inside approve_sub_order, which locks the
 * order, computes the expiry from the plan, auto-assigns a credential if the
 * pool has room, and writes the audit rows — all in one transaction. Approving
 * the same order twice returns the existing subscription instead of making a
 * second one, so a double-click is harmless.
 */

const schema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["approve", "reject", "hold"]),
  credentialId: z.string().uuid().optional().nullable(),
  autoAssign: z.boolean().default(true),
  reason: z.string().trim().max(500).optional(),
  notify: z.boolean().default(true),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { orderId, action, credentialId, autoAssign, reason, notify } = parsed.data;
  const svc = createAdminClient();

  const { data: order } = await svc
    .from("sub_orders")
    .select("id, user_id, product_id, plan_id, status, amount_bdt, txn_ref, sub_products(name), sub_plans(name, duration_days)")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.status === "approved") {
    return NextResponse.json({ error: "This order was already approved." }, { status: 409 });
  }
  if (order.status === "rejected" && action !== "approve") {
    return NextResponse.json({ error: "This order was already rejected." }, { status: 409 });
  }

  const now = new Date().toISOString();

  // ---------------- hold ----------------
  if (action === "hold") {
    const { error } = await svc
      .from("sub_orders")
      .update({ status: "on_hold", hold_reason: reason || null })
      .eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction(admin.id, "SUB_ORDER_HELD", orderId, {
      user_id: order.user_id,
      reason: reason ?? null,
    });
    return NextResponse.json({ ok: true, note: "Order put on hold." });
  }

  // ---------------- reject ----------------
  if (action === "reject") {
    const { error } = await svc
      .from("sub_orders")
      .update({
        status: "rejected",
        reject_reason: reason || null,
        reviewed_by: admin.id,
        reviewed_at: now,
      })
      .eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction(admin.id, "SUB_ORDER_REJECTED", orderId, {
      user_id: order.user_id,
      txn_ref: order.txn_ref,
      reason: reason ?? null,
    });
    return NextResponse.json({
      ok: true,
      note: "Order rejected. The customer sees the reason on their dashboard.",
    });
  }

  // ---------------- approve ----------------
  const { data: created, error: rpcError } = await svc.rpc("approve_sub_order", {
    p_order_id: orderId,
    p_admin_id: admin.id,
    p_credential_id: credentialId ?? null,
    p_auto_assign: autoAssign,
  });

  if (rpcError) {
    // The function raises named errors; translate the ones an admin can act on.
    const message = rpcError.message || "";
    const friendly =
      message.includes("CREDENTIAL_FULL")
        ? "That credential is already at its user limit. Pick another one."
        : message.includes("CREDENTIAL_PRODUCT_MISMATCH")
          ? "That credential belongs to a different product."
          : message.includes("CREDENTIAL_NOT_ACTIVE")
            ? "That credential is not active."
            : message.includes("ORDER_NOT_APPROVABLE")
              ? "This order is not in an approvable state."
              : message.includes("PLAN_NOT_FOUND")
                ? "The plan on this order no longer exists."
                : message;
    return NextResponse.json({ error: friendly }, { status: 409 });
  }

  const subscription = Array.isArray(created) ? created[0] : created;
  if (!subscription) {
    return NextResponse.json({ error: "Subscription was not created." }, { status: 500 });
  }

  const assigned = Boolean(subscription.credential_id);

  // Only tell the customer it is ready when it genuinely is. If the credential
  // pool was dry, the subscription sits in pending_credential and the email
  // waits until assign-credential runs.
  let emailed = false;
  if (notify && assigned) {
    const { data: profile } = await svc
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();

    if (profile?.email) {
      const { getInvoiceDeliveryEmailHtml } = await import("@/lib/emails/subscriptionTemplates");
      const productName = (order as any).sub_products?.name ?? "Subscription";
      const planName = (order as any).sub_plans?.name ?? "Subscription Plan";

      await sendEmail({
        to: profile.email,
        subject: `Invoice & Activation — ${productName}`,
        html: getInvoiceDeliveryEmailHtml({
          customerName: profile.full_name || "Valued Customer",
          orderId: order.id,
          productName,
          planName,
          amountBdt: Number(order.amount_bdt || 0),
          txnRef: order.txn_ref || "VERIFIED",
          expiryDate: formatDhakaDate(subscription.expiry_date),
        }),
      });
      emailed = true;
    }
  }

  await logAdminAction(admin.id, "SUB_ORDER_APPROVED", orderId, {
    user_id: order.user_id,
    subscription_id: subscription.id,
    credential_assigned: assigned,
    expiry_date: subscription.expiry_date,
    amount_bdt: order.amount_bdt,
  });

  // Trigger FazerCards Auto Fulfillment
  import("@/lib/auto-fulfill").then(({ processAutoFulfillment }) => {
    processAutoFulfillment({ orderId }).catch((err) =>
      console.error("[AutoFulfill Admin Approve Error]:", err)
    );
  });

  return NextResponse.json({
    ok: true,
    subscription,
    credentialAssigned: assigned,
    emailed,
    note: assigned
      ? `Approved. Credential assigned, expires ${formatDhakaDate(subscription.expiry_date)}.${
          emailed ? " Customer notified." : ""
        }`
      : "Approved, but no credential had a free slot. The subscription is waiting in the pending-credential queue.",
  });
}
