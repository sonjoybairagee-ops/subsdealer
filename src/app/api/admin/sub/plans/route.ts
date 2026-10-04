import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const baseSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  durationDays: z.number().int().min(1).max(3650),
  priceBdt: z.number().min(0).max(10_000_000),
  compareAtBdt: z.number().min(0).max(10_000_000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

const createSchema = baseSchema.refine(
  (v) => v.compareAtBdt == null || v.compareAtBdt > v.priceBdt,
  { message: "The compare-at price must be higher than the real price.", path: ["compareAtBdt"] },
);

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan data" },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const svc = createAdminClient();

  // The FK would catch this, but a clear message beats a Postgres error.
  const { data: product } = await svc
    .from("sub_products")
    .select("id, name")
    .eq("id", p.productId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { data, error } = await svc
    .from("sub_plans")
    .insert({
      product_id: p.productId,
      name: p.name,
      duration_days: p.durationDays,
      price_bdt: p.priceBdt,
      compare_at_bdt: p.compareAtBdt ?? null,
      sort_order: p.sortOrder,
      is_active: p.isActive,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, "SUB_PLAN_CREATED", data.id, {
    product: product.name,
    name: data.name,
    duration_days: data.duration_days,
    price_bdt: data.price_bdt,
  });
  return NextResponse.json({ plan: data });
}

const updateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(60).optional(),
    durationDays: z.number().int().min(1).max(3650).optional(),
    priceBdt: z.number().min(0).max(10_000_000).optional(),
    compareAtBdt: z.number().min(0).max(10_000_000).nullable().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => v.compareAtBdt == null || v.priceBdt == null || v.compareAtBdt > v.priceBdt,
    { message: "The compare-at price must be higher than the real price.", path: ["compareAtBdt"] },
  );

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan data" },
      { status: 400 },
    );
  }
  const { id, ...p } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (p.name !== undefined) updates.name = p.name;
  if (p.durationDays !== undefined) updates.duration_days = p.durationDays;
  if (p.priceBdt !== undefined) updates.price_bdt = p.priceBdt;
  if (p.compareAtBdt !== undefined) updates.compare_at_bdt = p.compareAtBdt;
  if (p.sortOrder !== undefined) updates.sort_order = p.sortOrder;
  if (p.isActive !== undefined) updates.is_active = p.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const svc = createAdminClient();
  const { data, error } = await svc
    .from("sub_plans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Changing duration_days only affects FUTURE purchases. Existing
  // subscriptions already carry a computed expiry_date, which is what we
  // want — nobody's term should move because a price list was edited.
  await logAdminAction(admin.id, "SUB_PLAN_UPDATED", id, { fields: Object.keys(updates) });
  return NextResponse.json({ plan: data });
}

/**
 * Hard-delete only if the plan was never bought; otherwise deactivate.
 * subscriptions.plan_id has no ON DELETE action, so deleting a sold plan
 * would fail on the FK anyway — this just explains why.
 */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { id } = parsed.data;

  const svc = createAdminClient();

  const [{ count: subCount }, { count: orderCount }] = await Promise.all([
    svc.from("subscriptions").select("id", { count: "exact", head: true }).eq("plan_id", id),
    svc.from("sub_orders").select("id", { count: "exact", head: true }).eq("plan_id", id),
  ]);
  const used = (subCount ?? 0) + (orderCount ?? 0);

  if (used > 0) {
    const { error } = await svc.from("sub_plans").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAction(admin.id, "SUB_PLAN_DEACTIVATED", id, { references: used });
    return NextResponse.json({
      ok: true,
      deleted: false,
      note: `This plan has ${used} order(s)/subscription(s) attached, so it was hidden instead of deleted.`,
    });
  }

  const { error } = await svc.from("sub_plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, "SUB_PLAN_DELETED", id, {});
  return NextResponse.json({ ok: true, deleted: true, note: "Plan deleted." });
}
