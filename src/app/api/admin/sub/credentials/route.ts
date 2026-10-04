import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";
import { encryptSecret, hasEncryptionKey } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getCredentialRotatedEmailHtml } from "@/lib/emails/subscriptionTemplates";

export const dynamic = "force-dynamic";

/**
 * Credential pool management.
 *
 * The plaintext password only ever exists inside this request handler.
 * It is encrypted before it touches Postgres and is never logged, never
 * echoed back in a response, and never written into admin_logs.
 */

const createSchema = z.object({
  productId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  label: z.string().trim().max(80).optional().nullable(),
  loginEmail: z.string().trim().email().max(200),
  // Optional: an invite product's row is just a seat counter for a panel,
  // so there is no login to store. Required for credential products below.
  password: z.string().min(1).max(500).optional(),
  loginUrl: z.string().trim().url().max(500).optional().nullable(),
  extraNotes: z.string().trim().max(2000).optional().nullable(),
  maxUsers: z.number().int().min(1).max(500).default(1),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid credential data" },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const svc = createAdminClient();

  const { data: product } = await svc
    .from("sub_products")
    .select("id, name, delivery_type")
    .eq("id", p.productId)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const isInvite = product.delivery_type === "invite";

  if (p.password && !hasEncryptionKey()) {
    return NextResponse.json(
      {
        error:
          "CREDENTIAL_ENC_KEY is missing or malformed on the server, so passwords cannot be stored.",
      },
      { status: 503 },
    );
  }

  if (!isInvite && !p.password) {
    return NextResponse.json(
      { error: `${product.name} is delivered as a login, so a password is required.` },
      { status: 400 },
    );
  }

  // A credential must not sit in a team belonging to a different product,
  // or sub_pick_credential would hand out the wrong login.
  if (p.teamId) {
    const { data: team } = await svc
      .from("sub_teams")
      .select("id, product_id, capacity")
      .eq("id", p.teamId)
      .maybeSingle();
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.product_id !== p.productId) {
      return NextResponse.json(
        { error: "That team belongs to a different product." },
        { status: 400 },
      );
    }
  }

  let passwordEnc: string | null = null;
  if (p.password) {
    try {
      passwordEnc = encryptSecret(p.password);
    } catch (e: any) {
      return NextResponse.json({ error: `Encryption failed: ${e.message}` }, { status: 500 });
    }
  }

  const { data, error } = await svc
    .from("sub_credentials")
    .insert({
      product_id: p.productId,
      team_id: p.teamId || null,
      label: p.label || null,
      login_email: p.loginEmail.toLowerCase(),
      password_enc: passwordEnc,
      login_url: p.loginUrl || null,
      extra_notes: p.extraNotes || null,
      max_users: p.maxUsers,
      status: "active",
    })
    .select("id, product_id, team_id, label, login_email, login_url, extra_notes, max_users, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Note what is NOT in the log: the password, and the ciphertext.
  await logAdminAction(admin.id, "SUB_CREDENTIAL_CREATED", data.id, {
    product: product.name,
    login_email: data.login_email,
    max_users: data.max_users,
    team_id: data.team_id,
  });

  return NextResponse.json({ credential: data });
}

/**
 * Update credential metadata, and optionally rotate the password.
 *
 * A rotation goes through the sub_rotate_credential RPC so that every
 * affected customer gets a CREDENTIAL_ROTATED audit row in the same
 * transaction as the password change. Customers then get an email,
 * because otherwise they just see "login failed" and open a ticket.
 */
const updateSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid().nullable().optional(),
  label: z.string().trim().max(80).nullable().optional(),
  loginEmail: z.string().trim().email().max(200).optional(),
  password: z.string().min(1).max(500).optional(),
  loginUrl: z.string().trim().url().max(500).nullable().optional(),
  extraNotes: z.string().trim().max(2000).nullable().optional(),
  maxUsers: z.number().int().min(1).max(500).optional(),
  status: z.enum(["active", "rotating", "revoked"]).optional(),
  notifyUsers: z.boolean().default(true),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid credential data" },
      { status: 400 },
    );
  }
  const { id, password, notifyUsers, ...p } = parsed.data;
  const svc = createAdminClient();

  const { data: existing } = await svc
    .from("sub_credentials")
    .select("id, product_id, login_email, max_users, sub_products(name)")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

  const { count: activeUsers } = await svc
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("credential_id", id)
    .eq("status", "active");

  // Shrinking max_users below the current headcount would make
  // sub_pick_credential and sub_assign_credential disagree with reality.
  if (p.maxUsers !== undefined && (activeUsers ?? 0) > p.maxUsers) {
    return NextResponse.json(
      {
        error: `${activeUsers} customer(s) are on this credential. Move someone off before lowering the limit to ${p.maxUsers}.`,
      },
      { status: 409 },
    );
  }

  if (p.teamId) {
    const { data: team } = await svc
      .from("sub_teams")
      .select("id, product_id")
      .eq("id", p.teamId)
      .maybeSingle();
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (team.product_id !== existing.product_id) {
      return NextResponse.json(
        { error: "That team belongs to a different product." },
        { status: 400 },
      );
    }
  }

  // ---- rotation first, so metadata edits cannot partially apply ----
  let rotatedSubscriptionIds: string[] = [];
  if (password) {
    if (!hasEncryptionKey()) {
      return NextResponse.json(
        { error: "CREDENTIAL_ENC_KEY is missing or malformed on the server." },
        { status: 503 },
      );
    }

    let passwordEnc: string;
    try {
      passwordEnc = encryptSecret(password);
    } catch (e: any) {
      return NextResponse.json({ error: `Encryption failed: ${e.message}` }, { status: 500 });
    }

    const { data: affected, error: rotateError } = await svc.rpc("sub_rotate_credential", {
      p_credential_id: id,
      p_password_enc: passwordEnc,
      p_login_email: p.loginEmail ? p.loginEmail.toLowerCase() : null,
      p_admin_id: admin.id,
    });
    if (rotateError) {
      return NextResponse.json({ error: rotateError.message }, { status: 500 });
    }
    rotatedSubscriptionIds = (affected as string[] | null) ?? [];
  }

  // ---- metadata ----
  const updates: Record<string, unknown> = {};
  if (p.teamId !== undefined) updates.team_id = p.teamId;
  if (p.label !== undefined) updates.label = p.label || null;
  if (p.loginEmail !== undefined && !password) updates.login_email = p.loginEmail.toLowerCase();
  if (p.loginUrl !== undefined) updates.login_url = p.loginUrl || null;
  if (p.extraNotes !== undefined) updates.extra_notes = p.extraNotes || null;
  if (p.maxUsers !== undefined) updates.max_users = p.maxUsers;
  if (p.status !== undefined) updates.status = p.status;

  if (Object.keys(updates).length > 0) {
    const { error } = await svc.from("sub_credentials").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Revoking a credential leaves its customers with nothing usable.
  // Flag them so the admin can reassign from the pending queue.
  let orphaned = 0;
  if (p.status === "revoked" && (activeUsers ?? 0) > 0) {
    const { data: orphans } = await svc
      .from("subscriptions")
      .update({ status: "pending_credential", credential_id: null })
      .eq("credential_id", id)
      .eq("status", "active")
      .select("id");
    orphaned = orphans?.length ?? 0;

    if (orphaned > 0) {
      await svc.from("sub_events").insert(
        (orphans ?? []).map((o: { id: string }) => ({
          subscription_id: o.id,
          credential_id: id,
          actor_id: admin.id,
          event: "CREDENTIAL_UNASSIGNED",
          meta: { reason: "credential_revoked" },
        })),
      );
    }
  }

  // ---- tell the customers their login changed ----
  let emailed = 0;
  if (password && notifyUsers && rotatedSubscriptionIds.length > 0) {
    const { data: recipients } = await svc
      .from("subscriptions")
      .select("id, profiles(email, full_name)")
      .in("id", rotatedSubscriptionIds);

    const productName = (existing as any).sub_products?.name ?? "your subscription";

    for (const row of recipients ?? []) {
      const profile = (row as any).profiles;
      if (!profile?.email) continue;
      try {
        await sendEmail({
          to: profile.email,
          subject: `Your ${productName} login has been updated`,
          html: getCredentialRotatedEmailHtml({
            customerName: profile.full_name || "Creator",
            productName,
          }),
        });
        emailed++;
      } catch {
        // An email failure must not roll back a completed rotation.
      }
    }
  }

  await logAdminAction(admin.id, password ? "SUB_CREDENTIAL_ROTATED" : "SUB_CREDENTIAL_UPDATED", id, {
    fields: Object.keys(updates),
    rotated: Boolean(password),
    affected_subscriptions: rotatedSubscriptionIds.length,
    orphaned,
    emailed,
  });

  return NextResponse.json({
    ok: true,
    rotated: Boolean(password),
    affectedSubscriptions: rotatedSubscriptionIds.length,
    orphaned,
    emailed,
    note: password
      ? `Password rotated. ${rotatedSubscriptionIds.length} customer(s) will see the new login immediately${
          emailed ? `, ${emailed} notified by email` : ""
        }.`
      : orphaned
        ? `Updated. ${orphaned} customer(s) moved back to the pending-credential queue.`
        : "Updated.",
  });
}
