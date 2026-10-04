import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";
import { SLUG_RE, PRODUCT_CATEGORIES } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(SLUG_RE, "Use a lowercase slug like adobe-creative-cloud"),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  thumbnailUrl: z.string().trim().url().max(500).optional().nullable(),
  category: z.enum(PRODUCT_CATEGORIES).optional().nullable(),
  accessType: z.enum(["personal", "shared"]).default("shared"),
  deliveryType: z.enum(["credential", "invite"]).default("credential"),
  loginUrl: z.string().trim().url().max(500).optional().nullable(),
  features: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  termsNote: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product data" },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const svc = createAdminClient();

  const { data, error } = await svc
    .from("sub_products")
    .insert({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline || null,
      description: p.description || null,
      thumbnail_url: p.thumbnailUrl || null,
      category: p.category || null,
      access_type: p.accessType,
      delivery_type: p.deliveryType,
      login_url: p.loginUrl || null,
      features: p.features,
      terms_note: p.termsNote || null,
      sort_order: p.sortOrder,
      is_active: p.isActive,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin.id, "SUB_PRODUCT_CREATED", data.id, { slug: data.slug, name: data.name });
  return NextResponse.json({ product: data });
}

const updateSchema = createSchema.partial().extend({ id: z.string().uuid() });

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product data" },
      { status: 400 },
    );
  }
  const { id, ...p } = parsed.data;

  // Map camelCase payload keys onto column names, skipping anything absent
  // so a PATCH of one field never blanks out the rest.
  const updates: Record<string, unknown> = {};
  if (p.slug !== undefined) updates.slug = p.slug;
  if (p.name !== undefined) updates.name = p.name;
  if (p.tagline !== undefined) updates.tagline = p.tagline || null;
  if (p.description !== undefined) updates.description = p.description || null;
  if (p.thumbnailUrl !== undefined) updates.thumbnail_url = p.thumbnailUrl || null;
  if (p.category !== undefined) updates.category = p.category || null;
  if (p.accessType !== undefined) updates.access_type = p.accessType;
  if (p.deliveryType !== undefined) updates.delivery_type = p.deliveryType;
  if (p.loginUrl !== undefined) updates.login_url = p.loginUrl || null;
  if (p.features !== undefined) updates.features = p.features;
  if (p.termsNote !== undefined) updates.terms_note = p.termsNote || null;
  if (p.sortOrder !== undefined) updates.sort_order = p.sortOrder;
  if (p.isActive !== undefined) updates.is_active = p.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const svc = createAdminClient();
  const { data, error } = await svc
    .from("sub_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await logAdminAction(admin.id, "SUB_PRODUCT_UPDATED", id, { fields: Object.keys(updates) });
  return NextResponse.json({ product: data });
}

/**
 * Deactivate, not delete.
 *
 * A hard delete would cascade into sub_plans and sub_credentials, and
 * subscriptions reference the product without ON DELETE CASCADE — so a
 * real delete would either fail on the FK or orphan paying customers.
 * Hiding it from the catalogue is what "remove" should mean here.
 */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const svc = createAdminClient();

  const { count } = await svc
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("product_id", parsed.data.id)
    .eq("status", "active");

  const { error } = await svc
    .from("sub_products")
    .update({ is_active: false })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, "SUB_PRODUCT_DEACTIVATED", parsed.data.id, {
    active_subscriptions: count ?? 0,
  });

  return NextResponse.json({
    ok: true,
    activeSubscriptions: count ?? 0,
    note:
      count && count > 0
        ? `Hidden from the catalogue. ${count} active subscription(s) keep working until they expire.`
        : "Hidden from the catalogue.",
  });
}
