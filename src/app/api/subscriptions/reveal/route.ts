import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, hasEncryptionKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * The only path by which a customer's credential leaves the database.
 *
 * sub_credentials has no RLS policy for regular users, so this route is the
 * single gate. Everything it checks matters:
 *
 *   1. signed in
 *   2. the subscription belongs to THIS user
 *   3. the subscription is active
 *   4. expiry_date is still in the future — re-read here, every request, so a
 *      missed cron run can never leak a credential
 *   5. a credential is actually bound
 *
 * Every successful reveal is written to sub_events. If a shared account gets
 * abused, that table is how we find out who had the password and when.
 */

const schema = z.object({ subscriptionId: z.string().uuid() });

/** Per-user reveal cap. Normal use is a handful a day; 30/hour is generous. */
const REVEAL_LIMIT_PER_HOUR = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasEncryptionKey()) {
    return NextResponse.json(
      { error: "Credential service is not configured. Please contact support." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const svc = createAdminClient();

  // Rate limit off the audit trail itself — no extra infrastructure, and it
  // counts the exact thing we care about.
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recentReveals } = await svc
    .from("sub_events")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", user.id)
    .eq("event", "CREDENTIAL_VIEWED")
    .gte("created_at", oneHourAgo);

  if ((recentReveals ?? 0) >= REVEAL_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const { data: sub } = await svc
    .from("subscriptions")
    .select(
      "id, user_id, status, expiry_date, credential_id, sub_products(name, delivery_type), sub_teams(name, login_url), sub_credentials(login_email, password_enc, login_url, extra_notes, status, updated_at)",
    )
    .eq("id", parsed.data.subscriptionId)
    .maybeSingle();

  // Same response for "does not exist" and "belongs to someone else", so this
  // cannot be used to probe which subscription ids are real.
  if (!sub || sub.user_id !== user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // An invite product has no password for the customer. The credential bound
  // to it is the panel's own login — handing that over would let them remove
  // every other member. The dashboard shows invite status instead and never
  // calls this route, so reaching here means something is off.
  if ((sub as any).sub_products?.delivery_type === "invite") {
    return NextResponse.json(
      {
        error:
          "This subscription is delivered as an invite to your own account, so there is no password to show.",
      },
      { status: 400 },
    );
  }

  if (sub.status === "revoked") {
    return NextResponse.json(
      { error: "Access to this subscription was withdrawn. Please contact support." },
      { status: 403 },
    );
  }
  if (sub.status === "paused") {
    return NextResponse.json(
      { error: "This subscription is paused while we sort out the account." },
      { status: 403 },
    );
  }
  if (sub.status === "pending_credential") {
    return NextResponse.json(
      { error: "Your login is still being assigned. It will appear here shortly." },
      { status: 409 },
    );
  }

  // The real expiry gate. Lazily flip the row too, so the dashboard and the
  // admin list agree even if the nightly job has not run.
  if (new Date(sub.expiry_date).getTime() <= Date.now()) {
    if (sub.status === "active") {
      await svc.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
      await svc.from("sub_events").insert({
        subscription_id: sub.id,
        credential_id: sub.credential_id,
        actor_id: user.id,
        event: "EXPIRED",
        meta: { auto: true, via: "reveal" },
      });
    }
    return NextResponse.json(
      { error: "This subscription has expired. Renew it to get access again." },
      { status: 403 },
    );
  }

  if (sub.status !== "active") {
    return NextResponse.json({ error: "This subscription is not active." }, { status: 403 });
  }

  const cred = (sub as any).sub_credentials;
  if (!sub.credential_id || !cred) {
    return NextResponse.json(
      { error: "Your login is still being assigned. It will appear here shortly." },
      { status: 409 },
    );
  }
  if (cred.status === "revoked") {
    return NextResponse.json(
      { error: "This login was retired. We are assigning you a new one." },
      { status: 409 },
    );
  }

  let password: string;
  try {
    password = decryptSecret(cred.password_enc);
  } catch {
    // Never surface the key-mismatch detail to a customer.
    console.error("[reveal] decrypt failed for subscription", sub.id);
    return NextResponse.json(
      { error: "We could not read your credential. Please contact support." },
      { status: 500 },
    );
  }

  const team = (sub as any).sub_teams;

  await svc.from("sub_events").insert({
    subscription_id: sub.id,
    credential_id: sub.credential_id,
    actor_id: user.id,
    event: "CREDENTIAL_VIEWED",
    meta: {
      by: "customer",
      ip: req.headers.get("x-forwarded-for") ?? null,
      ua: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
  });

  return NextResponse.json(
    {
      email: cred.login_email,
      password,
      loginUrl: cred.login_url ?? team?.login_url ?? null,
      team: team?.name ?? null,
      notes: cred.extra_notes ?? null,
      updatedAt: cred.updated_at,
    },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
}
