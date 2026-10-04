import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, logAdminAction } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  getSubscriptionReadyEmailHtml,
  getInviteSentEmailHtml,
} from "@/lib/emails/subscriptionTemplates";
import { formatDhakaDate } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Everything an admin does to a single subscription after it exists:
 * assigning or swapping a credential, moving it to another team, extending
 * the term, pausing, resuming, or revoking it.
 *
 * The three that touch credentials or teams go through the RPCs, because they
 * need row locks and capacity checks that are not safe to do in two round
 * trips from here.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign_credential"),
    subscriptionId: z.string().uuid(),
    credentialId: z.string().uuid(),
    notify: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("transfer_team"),
    subscriptionId: z.string().uuid(),
    teamId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("extend"),
    subscriptionId: z.string().uuid(),
    days: z.number().int().min(1).max(3650),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("pause"),
    subscriptionId: z.string().uuid(),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({ action: z.literal("resume"), subscriptionId: z.string().uuid() }),
  z.object({
    action: z.literal("mark_invited"),
    subscriptionId: z.string().uuid(),
    notify: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("update_invite_email"),
    subscriptionId: z.string().uuid(),
    inviteEmail: z.string().trim().email().max(200),
  }),
  z.object({
    action: z.literal("revoke"),
    subscriptionId: z.string().uuid(),
    reason: z.string().trim().max(500),
  }),
]);

function friendlyRpcError(message: string): string {
  if (message.includes("CREDENTIAL_FULL")) return "That credential is already at its user limit.";
  if (message.includes("CREDENTIAL_PRODUCT_MISMATCH"))
    return "That credential belongs to a different product.";
  if (message.includes("CREDENTIAL_NOT_ACTIVE")) return "That credential is not active.";
  if (message.includes("CREDENTIAL_NOT_FOUND")) return "Credential not found.";
  if (message.includes("TEAM_FULL")) return "That team is already at capacity.";
  if (message.includes("TEAM_PRODUCT_MISMATCH"))
    return "That team belongs to a different product.";
  if (message.includes("TEAM_INACTIVE")) return "That team is inactive.";
  if (message.includes("TEAM_NOT_FOUND")) return "Team not found.";
  if (message.includes("SUBSCRIPTION_NOT_ASSIGNABLE"))
    return "This subscription has expired or been revoked, so it cannot take a credential.";
  if (message.includes("SUBSCRIPTION_NOT_FOUND")) return "Subscription not found.";
  return message;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const svc = createAdminClient();

  const { data: sub } = await svc
    .from("subscriptions")
    .select("id, user_id, status, expiry_date, credential_id, team_id, invite_email, invited_at, sub_products(name, delivery_type), sub_plans(name)")
    .eq("id", body.subscriptionId)
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const productName = (sub as any).sub_products?.name ?? "subscription";

  switch (body.action) {
    // ---------------------------------------------------------------
    case "assign_credential": {
      const { data, error } = await svc.rpc("sub_assign_credential", {
        p_subscription_id: body.subscriptionId,
        p_credential_id: body.credentialId,
        p_admin_id: admin.id,
      });
      if (error) {
        return NextResponse.json({ error: friendlyRpcError(error.message) }, { status: 409 });
      }
      const updated = Array.isArray(data) ? data[0] : data;

      // Worth emailing: this is the moment a waiting customer can finally
      // log in, and they have no other way of knowing.
      let emailed = false;
      if (body.notify && updated?.status === "active") {
        const { data: profile } = await svc
          .from("profiles")
          .select("email, full_name")
          .eq("id", sub.user_id)
          .maybeSingle();
        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: `Your ${productName} is ready`,
            html: getSubscriptionReadyEmailHtml({
              customerName: profile.full_name || "Creator",
              productName,
              planName: (sub as any).sub_plans?.name ?? "Subscription",
              expiryDate: formatDhakaDate(updated.expiry_date),
            }),
          });
          emailed = true;
        }
      }

      await logAdminAction(admin.id, "SUB_CREDENTIAL_ASSIGNED", body.subscriptionId, {
        credential_id: body.credentialId,
        user_id: sub.user_id,
        emailed,
      });
      return NextResponse.json({
        ok: true,
        subscription: updated,
        emailed,
        note: emailed ? "Credential assigned and the customer was notified." : "Credential assigned.",
      });
    }

    // ---------------------------------------------------------------
    case "transfer_team": {
      const { data, error } = await svc.rpc("sub_transfer_team", {
        p_subscription_id: body.subscriptionId,
        p_team_id: body.teamId,
        p_admin_id: admin.id,
      });
      if (error) {
        return NextResponse.json({ error: friendlyRpcError(error.message) }, { status: 409 });
      }
      const updated = Array.isArray(data) ? data[0] : data;

      await logAdminAction(admin.id, "SUB_TEAM_TRANSFERRED", body.subscriptionId, {
        from_team_id: sub.team_id,
        to_team_id: body.teamId,
        user_id: sub.user_id,
      });
      return NextResponse.json({
        ok: true,
        subscription: updated,
        note: updated?.credential_id
          ? "Moved to the new team and rebound to one of its credentials."
          : "Moved to the new team, but no credential in it had a free slot — assign one manually.",
      });
    }

    // ---------------------------------------------------------------
    case "extend": {
      // Extend from whichever is later: the current expiry, or now. Adding
      // days to an already-lapsed date would hand back a term in the past.
      const base = Math.max(new Date(sub.expiry_date).getTime(), Date.now());
      const newExpiry = new Date(base + body.days * 86_400_000).toISOString();
      const reactivate = sub.status === "expired" && sub.credential_id;

      const { data, error } = await svc
        .from("subscriptions")
        .update({
          expiry_date: newExpiry,
          status: reactivate ? "active" : sub.status,
        })
        .eq("id", body.subscriptionId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "EXTENDED",
        meta: {
          days: body.days,
          from: sub.expiry_date,
          to: newExpiry,
          reason: body.reason ?? null,
          reactivated: Boolean(reactivate),
        },
      });

      await logAdminAction(admin.id, "SUB_EXTENDED", body.subscriptionId, {
        days: body.days,
        new_expiry: newExpiry,
        user_id: sub.user_id,
      });
      return NextResponse.json({
        ok: true,
        subscription: data,
        note: `Extended by ${body.days} days — now expires ${formatDhakaDate(newExpiry)}.${
          reactivate ? " Subscription reactivated." : ""
        }`,
      });
    }

    // ---------------------------------------------------------------
    case "pause": {
      if (sub.status !== "active") {
        return NextResponse.json({ error: "Only an active subscription can be paused." }, { status: 409 });
      }
      const { error } = await svc
        .from("subscriptions")
        .update({ status: "paused", admin_notes: body.reason || null })
        .eq("id", body.subscriptionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "PAUSED",
        meta: { reason: body.reason ?? null },
      });
      await logAdminAction(admin.id, "SUB_PAUSED", body.subscriptionId, { user_id: sub.user_id });

      // Deliberately NOT extending expiry_date here. Pausing stops access, it
      // does not buy time — use Extend if the customer deserves the days back.
      return NextResponse.json({
        ok: true,
        note: "Paused. The expiry date keeps running — use Extend to give the days back.",
      });
    }

    // ---------------------------------------------------------------
    case "resume": {
      if (sub.status !== "paused") {
        return NextResponse.json({ error: "This subscription is not paused." }, { status: 409 });
      }
      const expired = new Date(sub.expiry_date).getTime() <= Date.now();
      const { error } = await svc
        .from("subscriptions")
        .update({ status: expired ? "expired" : "active" })
        .eq("id", body.subscriptionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "RESUMED",
        meta: { expired_on_resume: expired },
      });
      await logAdminAction(admin.id, "SUB_RESUMED", body.subscriptionId, { user_id: sub.user_id });
      return NextResponse.json({
        ok: true,
        note: expired
          ? "Resumed, but the term had already run out — it is now marked expired. Extend it to give access back."
          : "Resumed.",
      });
    }

    // ---------------------------------------------------------------
    case "mark_invited": {
      if (!sub.invite_email) {
        return NextResponse.json(
          { error: "No invite email on this subscription. Set one first." },
          { status: 409 },
        );
      }

      const resend = Boolean(sub.invited_at);
      const { error } = await svc
        .from("subscriptions")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", body.subscriptionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "INVITE_SENT",
        meta: { invite_email: sub.invite_email, resend, team_id: sub.team_id },
      });

      // Tell them to go and look — an invite sitting unaccepted in a spam
      // folder is the single most common "it does not work" ticket.
      let emailed = false;
      if (body.notify) {
        const { data: profile } = await svc
          .from("profiles")
          .select("email, full_name")
          .eq("id", sub.user_id)
          .maybeSingle();
        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: `Your ${productName} invite has been sent`,
            html: getInviteSentEmailHtml({
              customerName: profile.full_name || "Creator",
              productName,
              inviteEmail: sub.invite_email,
              expiryDate: formatDhakaDate(sub.expiry_date),
            }),
          });
          emailed = true;
        }
      }

      await logAdminAction(admin.id, resend ? "SUB_INVITE_RESENT" : "SUB_INVITE_SENT", body.subscriptionId, {
        user_id: sub.user_id,
        invite_email: sub.invite_email,
        emailed,
      });

      return NextResponse.json({
        ok: true,
        note: `${resend ? "Invite re-sent" : "Marked as invited"} to ${sub.invite_email}.${
          emailed ? " Customer notified." : ""
        }`,
      });
    }

    // ---------------------------------------------------------------
    case "update_invite_email": {
      const next = body.inviteEmail.toLowerCase();
      const { error } = await svc
        .from("subscriptions")
        // Clear invited_at: the old address was invited, this one has not
        // been, so it goes back into the invite queue.
        .update({ invite_email: next, invited_at: null })
        .eq("id", body.subscriptionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "INVITE_EMAIL_CHANGED",
        meta: { from: sub.invite_email, to: next },
      });

      await logAdminAction(admin.id, "SUB_INVITE_EMAIL_CHANGED", body.subscriptionId, {
        user_id: sub.user_id,
        from: sub.invite_email,
        to: next,
      });

      return NextResponse.json({
        ok: true,
        note: `Invite email set to ${next}. It is back in the invite queue — send the invite again.`,
      });
    }

    // ---------------------------------------------------------------
    case "revoke": {
      const { error } = await svc
        .from("subscriptions")
        .update({ status: "revoked", revoked_reason: body.reason, credential_id: null })
        .eq("id", body.subscriptionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await svc.from("sub_events").insert({
        subscription_id: body.subscriptionId,
        credential_id: sub.credential_id,
        actor_id: admin.id,
        event: "REVOKED",
        meta: { reason: body.reason },
      });
      await logAdminAction(admin.id, "SUB_REVOKED", body.subscriptionId, {
        user_id: sub.user_id,
        reason: body.reason,
      });

      // Unbinding frees the seat immediately so the credential can be reused.
      return NextResponse.json({
        ok: true,
        note: "Revoked. Access is cut off straight away and the credential seat is free again.",
      });
    }
  }
}
