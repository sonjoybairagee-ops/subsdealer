import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  getSubscriptionExpiredEmailHtml,
  getSubscriptionExpiringEmailHtml,
} from "@/lib/emails/subscriptionTemplates";
import { safeEqual } from "@/lib/crypto";
import { daysRemaining, formatDhakaDate } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily housekeeping, run by Vercel Cron at 18:05 UTC (00:05 Asia/Dhaka).
 *
 * Two jobs:
 *   1. flip everything past its expiry date to 'expired' and tell those people
 *   2. nudge anyone with 7, 3 or 1 days left
 *
 * This is bookkeeping, NOT the security boundary. /api/subscriptions/reveal
 * re-checks expiry_date on every single request, so a missed or failed run
 * never hands out a credential it should not — it only means the dashboard
 * shows a stale badge until the next run.
 *
 * Safe to run twice in a day: expiring is idempotent by definition, and the
 * reminders are deduped through sub_events.
 */

/**
 * Days-left thresholds that get a reminder email.
 *
 * Ascending order matters. We pick a bucket with `find(b => left <= b)`, which
 * returns the FIRST match — so the list has to run tightest-first, otherwise
 * 3 days left would match the 7 bucket and nobody would ever receive the
 * 3-day or 1-day nudge.
 */
const REMINDER_BUCKETS = [1, 3, 7] as const;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Without a secret configured, refuse rather than run open to the internet.
  if (!secret) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return true;

  // Manual trigger, for testing from a terminal.
  return safeEqual(req.headers.get("x-cron-secret"), secret);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createAdminClient();
  const startedAt = Date.now();
  const result = {
    expired: 0,
    expiredEmails: 0,
    reminders: { 7: 0, 3: 0, 1: 0 } as Record<number, number>,
    errors: [] as string[],
  };

  // ---------------------------------------------------------------
  // 1. Who is lapsing right now?
  //
  // Read them BEFORE the RPC flips them — afterwards there is no way to tell
  // today's expiries apart from last month's.
  // ---------------------------------------------------------------
  const { data: dueRows, error: dueError } = await svc
    .from("subscriptions")
    .select("id, user_id, profiles(email, full_name), sub_products(name)")
    .eq("status", "active")
    .lte("expiry_date", new Date().toISOString())
    .limit(500);

  if (dueError) result.errors.push(`load due: ${dueError.message}`);

  const { data: expiredCount, error: expireError } = await svc.rpc("expire_due_subscriptions");
  if (expireError) {
    result.errors.push(`expire rpc: ${expireError.message}`);
  } else {
    result.expired = typeof expiredCount === "number" ? expiredCount : 0;
  }

  for (const row of dueRows ?? []) {
    const profile = (row as any).profiles;
    if (!profile?.email) continue;
    try {
      await sendEmail({
        to: profile.email,
        subject: `Your ${(row as any).sub_products?.name ?? "subscription"} has ended`,
        html: getSubscriptionExpiredEmailHtml({
          customerName: profile.full_name || "Creator",
          productName: (row as any).sub_products?.name ?? "subscription",
        }),
      });
      result.expiredEmails++;
    } catch (e: any) {
      result.errors.push(`expired email ${row.id}: ${e?.message ?? "failed"}`);
    }
  }

  // ---------------------------------------------------------------
  // 2. Renewal reminders
  // ---------------------------------------------------------------
  const horizon = new Date(Date.now() + 8 * 86_400_000).toISOString();
  const { data: upcoming, error: upcomingError } = await svc
    .from("subscriptions")
    .select("id, user_id, expiry_date, profiles(email, full_name), sub_products(name)")
    .eq("status", "active")
    .lte("expiry_date", horizon)
    .gt("expiry_date", new Date().toISOString())
    .limit(1000);

  if (upcomingError) {
    result.errors.push(`load upcoming: ${upcomingError.message}`);
  } else if ((upcoming ?? []).length > 0) {
    const ids = (upcoming ?? []).map((s: any) => s.id);

    // One query for every reminder already sent, instead of one per customer.
    const { data: sentEvents } = await svc
      .from("sub_events")
      .select("subscription_id, meta")
      .in("subscription_id", ids)
      .eq("event", "REMINDER_SENT");

    const alreadySent = new Set(
      (sentEvents ?? []).map((e: any) => `${e.subscription_id}:${e.meta?.bucket}`),
    );

    const newEvents: Record<string, unknown>[] = [];

    for (const sub of upcoming ?? []) {
      const left = daysRemaining((sub as any).expiry_date);
      // Collapse to the tightest bucket this subscription has reached, so a
      // run that happens to land on day 6 still sends the "7 days" nudge once.
      const bucket = REMINDER_BUCKETS.find((b) => left <= b);
      if (!bucket) continue;
      if (alreadySent.has(`${sub.id}:${bucket}`)) continue;

      const profile = (sub as any).profiles;
      if (!profile?.email) continue;

      try {
        await sendEmail({
          to: profile.email,
          subject:
            left <= 1
              ? `Your ${(sub as any).sub_products?.name ?? "subscription"} expires tomorrow`
              : `${left} days left on your ${(sub as any).sub_products?.name ?? "subscription"}`,
          html: getSubscriptionExpiringEmailHtml({
            customerName: profile.full_name || "Creator",
            productName: (sub as any).sub_products?.name ?? "your subscription",
            daysLeft: left,
            expiryDate: formatDhakaDate((sub as any).expiry_date),
          }),
        });
        result.reminders[bucket]++;
        newEvents.push({
          subscription_id: sub.id,
          actor_id: null,
          event: "REMINDER_SENT",
          meta: { bucket, days_left: left, auto: true },
        });
      } catch (e: any) {
        result.errors.push(`reminder ${sub.id}: ${e?.message ?? "failed"}`);
      }
    }

    if (newEvents.length > 0) {
      const { error } = await svc.from("sub_events").insert(newEvents);
      // If this insert fails the customer could get a duplicate reminder
      // tomorrow. Annoying, not harmful — worth logging loudly though.
      if (error) result.errors.push(`reminder log: ${error.message}`);
    }
  }

  const payload = { ...result, ms: Date.now() - startedAt, ranAt: new Date().toISOString() };
  console.log("[cron:expire-subscriptions]", JSON.stringify(payload));

  return NextResponse.json(payload, {
    status: result.errors.length > 0 ? 207 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
