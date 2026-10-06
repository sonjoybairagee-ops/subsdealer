/**
 * Automated FazerCards Supplier Order Fulfillment
 *
 * Automatically fulfills game top-ups (Player UID) and serial codes via FazerCards API
 * whenever an order is placed via Wallet or approved by admin.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createFazerOrder, validateFazerTopupId } from "@/lib/fazercards";

interface FulfillOrderParams {
  orderId: string;
  userEmail?: string;
}

export async function processAutoFulfillment({ orderId }: FulfillOrderParams): Promise<{
  success: boolean;
  message: string;
  fazerOrderId?: string;
}> {
  const adminClient = createAdminClient();

  // 1. Fetch order details with plan mapping metadata
  const { data: order, error } = await adminClient
    .from("sub_orders")
    .select("id, user_id, status, invite_email, sub_plans(id, name, fazercards_category_id, fazercards_offer_id, fazercards_type), sub_products(name, slug)")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { success: false, message: `Order ${orderId} not found.` };
  }

  const plan = (order as any).sub_plans;
  const product = (order as any).sub_products;

  const categoryId = plan?.fazercards_category_id;
  const offerId = plan?.fazercards_offer_id;
  const fazercardsType = plan?.fazercards_type || "topups";

  // If plan is not mapped to a FazerCards automated supplier offer, skip
  if (!categoryId || !offerId) {
    return {
      success: false,
      message: `Order ${orderId} (${product?.name}) is set to manual fulfillment.`,
    };
  }

  const playerId = order.invite_email?.trim();
  if (fazercardsType === "topups" && !playerId) {
    return {
      success: false,
      message: "Player ID is missing for UID top-up order.",
    };
  }

  try {
    // 2. Validate Player ID if it's a UID top-up
    if (fazercardsType === "topups" && playerId) {
      const valResult = await validateFazerTopupId(categoryId, { player_id: playerId });
      if (valResult.valid === false) {
        return {
          success: false,
          message: `Player ID validation failed: ${valResult.message || "Invalid Player ID"}`,
        };
      }
    }

    // 3. Execute FazerCards order placement with Idempotency Key (orderId)
    const result = await createFazerOrder({
      type: fazercardsType,
      categoryId,
      offerId,
      quantity: 1,
      fields: fazercardsType === "topups" && playerId ? { player_id: playerId } : undefined,
      idempotencyKey: order.id,
    });

    if (result.status === "completed" || result.status === "processing") {
      // If gift card / game key codes were delivered directly
      if (result.delivered_codes && result.delivered_codes.length > 0) {
        const deliveredCode = result.delivered_codes.join(", ");
        await adminClient
          .from("sub_orders")
          .update({
            status: "approved",
            notes: `FazerCards Auto-Delivered: ${deliveredCode} (Supplier Ref: ${result.order_id})`,
          })
          .eq("id", order.id);
      } else {
        await adminClient
          .from("sub_orders")
          .update({
            status: "approved",
            notes: `FazerCards Auto-Topup Sent to Player ID: ${playerId} (Supplier Ref: ${result.order_id})`,
          })
          .eq("id", order.id);
      }

      return {
        success: true,
        message: `Order ${order.id} automatically fulfilled via FazerCards! Supplier Order ID: ${result.order_id}`,
        fazerOrderId: result.order_id,
      };
    } else {
      return {
        success: false,
        message: `FazerCards order failed with status: ${result.status}`,
      };
    }
  } catch (err: any) {
    console.error(`[AutoFulfill Error] Order ${order.id}:`, err);
    return {
      success: false,
      message: err.message || "Auto fulfillment exception occurred.",
    };
  }
}
