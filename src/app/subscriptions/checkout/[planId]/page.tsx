import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { SubCheckoutForm } from "@/components/SubCheckoutForm";

export const dynamic = "force-dynamic";

export default async function SubscriptionCheckoutPage({
  params,
}: {
  params: { planId: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.planId);
  if (!isUuid) notFound();

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("sub_plans")
    .select(
      "id, name, duration_days, price_bdt, compare_at_bdt, is_active, sub_products(id, name, slug, access_type, delivery_type, is_active, features)",
    )
    .eq("id", params.planId)
    .maybeSingle();

  const product = (plan as any)?.sub_products;
  if (!plan || !plan.is_active || !product?.is_active) notFound();

  // Surface an existing pending payment rather than letting them submit a
  // second one and then telling them off at the API.
  const { data: pending } = await supabase
    .from("sub_orders")
    .select("id, txn_ref, created_at, status")
    .eq("user_id", user.id)
    .eq("plan_id", plan.id)
    .in("status", ["pending", "on_hold"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <SubCheckoutForm
      plan={{
        id: plan.id,
        name: plan.name,
        duration_days: plan.duration_days,
        price_bdt: Number(plan.price_bdt),
        compare_at_bdt: plan.compare_at_bdt ? Number(plan.compare_at_bdt) : null,
      }}
      product={{
        name: product.name,
        slug: product.slug,
        access_type: product.access_type,
        delivery_type: product.delivery_type ?? "credential",
        features: Array.isArray(product.features) ? product.features : [],
      }}
      pendingOrder={pending ?? null}
      bkashNumber={process.env.NEXT_PUBLIC_BKASH_NUMBER || "01922577297"}
    />
  );
}
