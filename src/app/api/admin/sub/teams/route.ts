import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  capacity: z.number().int().min(1).max(500).default(5),
  loginUrl: z.string().trim().url().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid team data" },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const svc = createAdminClient();

  const { data: product } = await svc
    .from("sub_products")
    .select("id, name")
    .eq("id", p.productId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { data, error } = await svc
    .from("sub_teams")
    .insert({
      product_id: p.productId,
      name: p.name,
      capacity: p.capacity,
      login_url: p.loginUrl || null,
      notes: p.notes || null,
      is_active: p.isActive,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `"${p.name}" already exists for ${product.name}.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin.id, "SUB_TEAM_CREATED", data.id, {
    product: product.name,
    name: data.name,
    capacity: data.capacity,
  });
  return NextResponse.json({ team: data });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  loginUrl: z.string().trim().url().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid team data" },
      { status: 400 },
    );
  }
  const { id, ...p } = parsed.data;
  const svc = createAdminClient();

  // Shrinking a team below its current headcount would silently
  // oversubscribe it and break the capacity checks in sub_transfer_team.
  if (p.capacity !== undefined) {
    const { count } = await svc
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("team_id", id)
      .eq("status", "active");

    if ((count ?? 0) > p.capacity) {
      return NextResponse.json(
        {
          error: `This team already has ${count} active members. Move someone out before lowering capacity to ${p.capacity}.`,
        },
        { status: 409 },
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (p.name !== undefined) updates.name = p.name;
  if (p.capacity !== undefined) updates.capacity = p.capacity;
  if (p.loginUrl !== undefined) updates.login_url = p.loginUrl || null;
  if (p.notes !== undefined) updates.notes = p.notes || null;
  if (p.isActive !== undefined) updates.is_active = p.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await svc
    .from("sub_teams")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A team with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await logAdminAction(admin.id, "SUB_TEAM_UPDATED", id, { fields: Object.keys(updates) });
  return NextResponse.json({ team: data });
}

/** Deactivate. Credentials and subscriptions keep pointing at it for audit. */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const svc = createAdminClient();
  const { count } = await svc
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("team_id", parsed.data.id)
    .eq("status", "active");

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `${count} active member(s) are still on this team. Transfer them first.`,
      },
      { status: 409 },
    );
  }

  const { error } = await svc
    .from("sub_teams")
    .update({ is_active: false })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin.id, "SUB_TEAM_DEACTIVATED", parsed.data.id, {});
  return NextResponse.json({ ok: true, note: "Team deactivated." });
}
