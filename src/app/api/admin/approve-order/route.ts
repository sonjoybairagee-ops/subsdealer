import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { encryptSecret } from "@/lib/crypto";

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

    // 2. Fetch the order details (sub_orders is the primary table)
    let order: any = null;
    const { data: fetchOrder } = await supabase
      .from("sub_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchOrder) {
      order = fetchOrder;
    } else {
      // Fallback check in orders or sub_user_products
      const { data: fallbackOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (fallbackOrder) {
        order = fallbackOrder;
      } else {
        const { data: sub } = await supabase
          .from("sub_user_products")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        if (sub) order = sub;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3. Update order status to approved/completed
    const { error: updateError } = await supabase
      .from("sub_orders")
      .update({ status: "approved" })
      .eq("id", orderId);

    if (updateError) {
      await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
      await supabase.from("sub_user_products").update({ status: "active" }).eq("id", orderId);
    }

    // 4. Trigger atomic referral commission calculation (idempotent, 5% cashback to referrer)
    try {
      await supabase.rpc("credit_referral_commission", { p_order_id: orderId, p_rate: 0.05 });
    } catch (refError) {
      console.error("Error crediting referral commission:", refError);
    }

    // 5. Check if this is an Adobe Creative Cloud product
    const serviceName = order.service_name || order.product_name || "";
    const isAdobeProduct = serviceName.toLowerCase().includes("adobe");

    let assignedCredentials: any = null;
    let credentialAssigned = false;

    if (isAdobeProduct) {
      // Try to find an available Adobe account (not used)
      const { data: availableAccount, error: availError } = await supabase
        .from("adobe_accounts")
        .select("*")
        .eq("is_used", false)
        .limit(1)
        .maybeSingle();

      if (availableAccount && !availError) {
        // Auto-assign: Convert Adobe account to credential
        const passwordEnc = encryptSecret(availableAccount.password);

        const { data: credential, error: credError } = await supabase
          .from("sub_credentials")
          .insert({
            login_email: availableAccount.email,
            password_enc: passwordEnc,
            login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
            extra_notes: "Adobe Creative Cloud All Apps Account",
          })
          .select()
          .single();

        if (!credError && credential) {
          // Mark Adobe account as used
          await supabase
            .from("adobe_accounts")
            .update({ is_used: true })
            .eq("id", availableAccount.id);

          assignedCredentials = {
            email_address: availableAccount.email,
            login_url: "https://www.adobe.com/creativecloud/catalog/desktop.html",
            credential_id: credential.id,
          };
          credentialAssigned = true;
        }
      }
    }

    // 6. If no Adobe account was assigned, use the old shared account system as fallback
    if (!credentialAssigned) {
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

      assignedCredentials = {
        email_address: assignedEmail,
        password: assignedPassword,
        access_key: accessKey,
        service_name: serviceName,
        status: "ACTIVE",
      };
    }

    // 7. Trigger non-blocking WhatsApp notification
    try {
      const userPhone = order.phone || order.phone_number || "";
      if (userPhone) {
        const messageText = credentialAssigned
          ? `হ্যালো! আপনার ${serviceName} অর্ডারটি অ্যাপ্রুভ হয়েছে। Credential দেখতে লগইন করুন: https://subsdealer.com/dashboard`
          : `হ্যালো! আপনার ${serviceName} অর্ডারটি অ্যাপ্রুভ হয়েছে। Unique Access Key: ${assignedCredentials.access_key}। পোর্টাল দেখতে লগইন করুন: https://subsdealer.com/dashboard`;

        sendWhatsAppNotification({
          userId: order.user_id,
          phone: userPhone,
          eventType: "order_approved",
          referenceId: orderId,
          messageText,
          payload: assignedCredentials,
        });
      }
    } catch (waErr) {
      console.warn("Non-blocking WhatsApp trigger warning:", waErr);
    }

    return NextResponse.json({
      success: true,
      message: credentialAssigned
        ? "Order approved and Adobe account assigned successfully!"
        : "Order approved and shared account credentials assigned successfully!",
      credential_assigned: credentialAssigned,
      assigned_credentials: assignedCredentials,
    });
  } catch (err: any) {
    console.error("Server error in approve-order:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
