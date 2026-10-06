import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId || body.order_id;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 1. Verify admin authorization
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 2. Fetch the order details
    let order: any = null;
    const { data: fetchOrder, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchOrder) {
      order = fetchOrder;
    } else {
      // Fallback check in sub_user_products if orders table differs
      const { data: sub } = await supabase
        .from("sub_user_products")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (sub) {
        order = sub;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Update order status to approved/completed
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "approved" })
      .eq("id", orderId);

    if (updateError) {
      // Fallback update in sub_user_products if applicable
      await supabase.from("sub_user_products").update({ status: "active" }).eq("id", orderId);
    }

    // 4. Automatically assign a shared subscription account if service matches
    const serviceName = order.service_name || order.product_name || "Adobe Creative Cloud";

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const assignedEmail = `sarahanderson${randomSuffix}@portal.subsdealer.com`;
    const assignedPassword = `Subs@${randomSuffix}!`;
    const prefix = `sarahanderson${randomSuffix}`;

    // Generate unique Access Key (e.g. SUBS-9842-ADOBE)
    const keyCode = Math.floor(1000 + Math.random() * 9000);
    const accessKey = `SUBS-${keyCode}-${serviceName.split(" ")[0].toUpperCase()}`;

    // Insert into user_generated_emails
    await supabase.from("user_generated_emails").upsert(
      {
        user_id: order.user_id,
        email_address: assignedEmail.toLowerCase().trim(),
        prefix,
        password: assignedPassword,
        service_name: serviceName,
        access_key: accessKey,
        status: "ACTIVE",
      },
      { onConflict: "email_address" }
    );

    // Insert into shared_subscription_accounts
    try {
      await supabase.from("shared_subscription_accounts").upsert(
        {
          user_id: order.user_id,
          service_name: serviceName,
          email_address: assignedEmail.toLowerCase().trim(),
          password: assignedPassword,
          access_key: accessKey,
          status: "ACTIVE",
        },
        { onConflict: "email_address" }
      );
    } catch (assignError) {
      console.error("Error assigning account credentials to shared_subscription_accounts:", assignError);
    }

    return NextResponse.json({
      success: true,
      message: "Order approved and shared account credentials assigned successfully!",
      access_key: accessKey,
      assigned_credentials: {
        email_address: assignedEmail,
        password: assignedPassword,
        access_key: accessKey,
        service_name: serviceName,
        status: "ACTIVE",
      },
    });
  } catch (err: any) {
    console.error("Server error in approve-order:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
