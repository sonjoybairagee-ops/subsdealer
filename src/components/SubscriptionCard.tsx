"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { callApi, copyToClipboard } from "@/lib/api-client";
import {
  daysRemaining,
  describeDuration,
  formatDhakaDate,
  inviteState,
  subscriptionStatusMeta,
  termProgress,
  timeAgo,
  type RevealedCredential,
  type SubscriptionStatus,
} from "@/lib/subscriptions";

/** Revealed passwords hide themselves — a screen is a public place. */
const REVEAL_TTL_MS = 90_000;

export interface SubscriptionCardData {
  id: string;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string;
  productName: string;
  productSlug: string;
  accessType: string;
  deliveryType: string;
  planName: string;
  durationDays: number;
  hasCredential: boolean;
  invite_email: string | null;
  invited_at: string | null;
  teamName: string | null;
}

export function SubscriptionCard({ sub }: { sub: SubscriptionCardData }) {
  const [cred, setCred] = useState<RevealedCredential | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const meta = subscriptionStatusMeta(sub.status);
  const left = daysRemaining(sub.expiry_date);
  const progress = termProgress(sub.start_date, sub.expiry_date);
  const isActive = sub.status === "active";
  const endingSoon = isActive && left <= 7;
  const isInvite = sub.deliveryType === "invite";
  const invite = inviteState(sub);

  useEffect(() => {
    if (!showPassword) return;
    setSecondsLeft(Math.round(REVEAL_TTL_MS / 1000));
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setShowPassword(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [showPassword]);

  // Drop the secret from memory when the card goes away.
  useEffect(
    () => () => {
      setCred(null);
      setShowPassword(false);
    },
    [],
  );

  async function load(thenShow: boolean) {
    setBusy(true);
    setErr(null);
    const res = await callApi<RevealedCredential>("/api/subscriptions/reveal", "POST", {
      subscriptionId: sub.id,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setErr(res.error);
      return;
    }
    setCred(res.data);
    if (thenShow) setShowPassword(true);
  }

  async function copy(label: string, value: string) {
    const ok = await copyToClipboard(value);
    setCopied(ok ? label : null);
    setTimeout(() => setCopied(null), 1800);
  }

  async function copyBoth() {
    let data = cred;
    if (!data) {
      setBusy(true);
      const res = await callApi<RevealedCredential>("/api/subscriptions/reveal", "POST", {
        subscriptionId: sub.id,
      });
      setBusy(false);
      if (!res.ok || !res.data) {
        setErr(res.error);
        return;
      }
      data = res.data;
      setCred(data);
    }
    await copy("both", `Email: ${data.email}\nPassword: ${data.password}`);
  }

  return (
    <article className="card overflow-hidden">
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.06] bg-gradient-to-r from-[#e5243b]/[.07] to-transparent p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-white">{sub.productName}</h2>
            <span className={`badge badge-${meta.tone === "green" ? "green" : meta.tone}`}>
              {meta.label}
            </span>
            {isInvite && (isActive || sub.status === "pending_credential") && (
              <span className={`badge badge-${invite.tone === "green" ? "green" : invite.tone}`}>
                {invite.label}
              </span>
            )}
          </div>
          <p className="muted mt-1 text-sm">
            {sub.planName} · {describeDuration(sub.durationDays)} ·{" "}
            {isInvite
              ? "On your own account"
              : sub.accessType === "shared"
                ? "Shared account"
                : "Personal account"}
          </p>
        </div>

        {isActive && (
          <div className="text-right">
            <p className={`text-3xl font-black ${endingSoon ? "text-[#ffcf8c]" : "text-white"}`}>
              {left}
            </p>
            <p className="muted text-xs">day{left === 1 ? "" : "s"} left</p>
          </div>
        )}
      </div>

      {/* ---- dates ---- */}
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="muted text-xs uppercase tracking-wider">Started</p>
          <p className="mt-1 font-bold text-white">{formatDhakaDate(sub.start_date)}</p>
        </div>
        <div>
          <p className="muted text-xs uppercase tracking-wider">
            {sub.status === "expired" ? "Ended" : "Expires"}
          </p>
          <p className="mt-1 font-bold text-white">{formatDhakaDate(sub.expiry_date)}</p>
        </div>
        <div>
          <p className="muted text-xs uppercase tracking-wider">Team</p>
          <p className="mt-1 font-bold text-white">{cred?.team ?? sub.teamName ?? "—"}</p>
        </div>
      </div>

      {isActive && (
        <div className="px-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
            <div
              className={`h-full rounded-full ${endingSoon ? "bg-[#ffb347]" : "bg-[#e5243b]"}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ---- credential area ---- */}
      <div className="p-6">
        {/* For an invite product, "waiting on a panel" and "waiting on the
            invite" look the same to the customer, so both go down the invite
            branch rather than showing a credential-flavoured message. */}
        {!isActive && !(isInvite && sub.status === "pending_credential") ? (
          <div className="rounded-xl border border-white/[.08] bg-white/[.02] p-5">
            <p className="text-sm leading-6 text-[#c7ccd6]">{meta.hint}</p>
            {(sub.status === "expired" || sub.status === "revoked") && (
              <Link
                href={`/subscriptions/${sub.productSlug}`}
                className="btn-primary mt-4 inline-block"
              >
                Renew →
              </Link>
            )}
          </div>
        ) : isInvite ? (
          /* Invite delivery: there is no password to show, and showing one
             would be actively wrong — it would be the panel's own login. */
          <div
            className={`rounded-xl border p-5 ${
              invite.tone === "green"
                ? "border-[#e5243b]/25 bg-[#e5243b]/[.06]"
                : invite.tone === "danger"
                  ? "border-[#ff6b6b]/25 bg-[#ff6b6b]/[.06]"
                  : "border-[#ffb347]/25 bg-[#ffb347]/[.06]"
            }`}
          >
            <p className="text-sm leading-6 text-[#c7ccd6]">{invite.hint}</p>

            {sub.invite_email && (
              <div className="mt-4">
                <p className="label">Invite sent to</p>
                <div className="flex items-center gap-2">
                  <code className="input flex-1 truncate font-mono">{sub.invite_email}</code>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => copy("invite", sub.invite_email!)}
                  >
                    {copied === "invite" ? "✓" : "Copy"}
                  </button>
                </div>
                {sub.invited_at && (
                  <p className="muted mt-1 text-xs">Sent {timeAgo(sub.invited_at)}</p>
                )}
              </div>
            )}

            {sub.invited_at && (
              <ul className="mt-4 space-y-1.5 border-t border-white/[.06] pt-4">
                {[
                  "Open that inbox and look for the invite",
                  "Check spam and promotions if it is not there",
                  "Accept it — premium turns on straight away",
                ].map((x) => (
                  <li key={x} className="flex gap-2 text-sm text-[#c7ccd6]">
                    <span className="text-[#ff7585]">✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            )}

            <p className="muted mt-4 text-xs leading-5">
              Wrong address, or never got it? Contact support and we will resend it.
            </p>
          </div>
        ) : !cred ? (
          <div className="rounded-xl border border-white/[.08] bg-white/[.02] p-5 text-center">
            <p className="text-sm text-[#c7ccd6]">
              Your login is ready. Reveal it when you need it — each view is logged.
            </p>
            <button className="btn-primary mt-4" disabled={busy} onClick={() => load(true)}>
              {busy ? "Loading…" : "Show my login"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="label">Email / username</p>
              <div className="flex items-center gap-2">
                <code className="input flex-1 truncate font-mono">{cred.email}</code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copy("email", cred.email)}
                >
                  {copied === "email" ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <p className="label">Password</p>
              <div className="flex items-center gap-2">
                <code className="input flex-1 truncate font-mono">
                  {showPassword ? cred.password : "••••••••••••"}
                </code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copy("password", cred.password)}
                >
                  {copied === "password" ? "✓" : "Copy"}
                </button>
              </div>
              {showPassword && (
                <p className="muted mt-1 text-xs">Hides automatically in {secondsLeft}s</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={copyBoth} disabled={busy}>
                {copied === "both" ? "✓ Copied" : "Copy both"}
              </button>
              {cred.loginUrl && (
                <a
                  href={cred.loginUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-secondary"
                >
                  Open login page ↗
                </a>
              )}
              <span className="muted text-xs">Updated {timeAgo(cred.updatedAt)}</span>
            </div>

            {cred.notes && (
              <div className="rounded-xl border border-[#ffb347]/25 bg-[#ffb347]/[.06] p-4">
                <p className="text-sm leading-6 text-[#ffd9a8]">{cred.notes}</p>
              </div>
            )}

            {sub.accessType === "shared" && (
              <p className="muted text-xs leading-5">
                Shared account — please do not change the password or account settings. Doing so
                locks out other users and ends your access.
              </p>
            )}
          </div>
        )}

        {err && (
          <p className="mt-4 rounded-lg border border-[#ff6b6b]/25 bg-[#ff6b6b]/[.07] p-3 text-sm text-[#ff9d9d]">
            {err}
          </p>
        )}

        {endingSoon && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ffb347]/25 bg-[#ffb347]/[.06] p-4">
            <p className="text-sm text-[#ffd9a8]">
              {left === 0
                ? "This expires today."
                : `Only ${left} day${left === 1 ? "" : "s"} left on this subscription.`}
            </p>
            <Link href={`/subscriptions/${sub.productSlug}`} className="btn-secondary">
              Renew
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
