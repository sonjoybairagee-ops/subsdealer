import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";
import { decryptSecret, hasEncryptionKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * Admin-side credential reveal.
 *
 * Separate from /api/subscriptions/reveal on purpose: that one is scoped
 * to the signed-in customer's own subscription, this one lets an admin
 * read any credential in the pool. Both of them write an audit row, so
 * "who saw this password" always has an answer.
 */

const schema = z.object({ credentialId: z.string().uuid() });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!hasEncryptionKey()) {
    return NextResponse.json(
      { error: "CREDENTIAL_ENC_KEY is missing or malformed on the server." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credential id" }, { status: 400 });
  }

  const svc = createAdminClient();
  const { data: cred } = await svc
    .from("sub_credentials")
    // One string literal, not a concatenation: supabase-js parses the
    // select at type level and a joined string widens to `string`.
    .select(
      "id, login_email, password_enc, login_url, extra_notes, status, rotated_at, updated_at, sub_products(name), sub_teams(name, login_url)",
    )
    .eq("id", parsed.data.credentialId)
    .maybeSingle();

  if (!cred) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

  let password: string;
  try {
    password = decryptSecret(cred.password_enc);
  } catch (e: any) {
    // Almost always a key mismatch: the row was written under a different
    // CREDENTIAL_ENC_KEY. Say so plainly instead of a generic 500.
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const team = (cred as any).sub_teams;

  await svc.from("sub_events").insert({
    subscription_id: null,
    credential_id: cred.id,
    actor_id: admin.id,
    event: "CREDENTIAL_VIEWED",
    meta: {
      by: "admin",
      admin_email: admin.email,
      ip: req.headers.get("x-forwarded-for") ?? null,
    },
  });

  await logAdminAction(admin.id, "SUB_CREDENTIAL_VIEWED", cred.id, {
    login_email: cred.login_email,
    product: (cred as any).sub_products?.name ?? null,
  });

  return NextResponse.json(
    {
      email: cred.login_email,
      password,
      loginUrl: cred.login_url ?? team?.login_url ?? null,
      team: team?.name ?? null,
      notes: cred.extra_notes ?? null,
      status: cred.status,
      rotatedAt: cred.rotated_at,
      updatedAt: cred.updated_at,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
