"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { callApi, copyToClipboard } from "@/lib/api-client";
import { CheckoutSteps } from "@/components/CheckoutSteps";
import {
  describeDuration,
  discountPercent,
  formatBdt,
  formatDhakaDate,
  isValidTxnRef,
} from "@/lib/subscriptions";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export function SubCheckoutForm({
  plan,
  product,
  pendingOrder,
  bkashNumber,
}: {
  plan: {
    id: string;
    name: string;
    duration_days: number;
    price_bdt: number;
    compare_at_bdt: number | null;
  };
  product: {
    name: string;
    slug: string;
    access_type: string;
    delivery_type: string;
    features: string[];
  };
  pendingOrder: { id: string; txn_ref: string | null; created_at: string; status: string } | null;
  bkashNumber: string;
}) {
  const router = useRouter();
  const [txnRef, setTxnRef] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);

  const off = discountPercent(plan.price_bdt, plan.compare_at_bdt);
  const isInvite = product.delivery_type === "invite";
  // ChatGPT is activated on the customer's own account (we log in and
  // subscribe), so there is no invite link — we coordinate over WhatsApp.
  // Canva and other invite products do send a real team invite.
  const isManaged = product.slug.startsWith("chatgpt");
  // Game top-ups (PUBG UC, etc.) collect a Player ID at checkout instead of
  // an email, and we top the account up directly.
  const GAME_SLUGS = ["pubg", "free-fire", "mobile-legends", "genshin", "delta-force", "valorant", "farlight", "game-"];
  const isGame = GAME_SLUGS.some((s) => product.slug.startsWith(s));
  const WHATSAPP_SUPPORT = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT || "";
  // An invite product never involves a shared password, so the shared-account
  // warning and its tick-box would just confuse people.
  const isShared = product.access_type === "shared" && !isInvite;

  // Show the term the customer is actually buying, computed from today.
  const expiry = new Date(Date.now() + plan.duration_days * 86_400_000);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;

    if (!isValidTxnRef(txnRef)) {
      setErr(
        "That Transaction ID does not look right. It should be 8–12 characters with both letters and numbers.",
      );
      return;
    }
    if (!file) {
      setErr("Please attach a screenshot of the payment.");
      return;
    }
    if (isShared && !agreed) {
      setErr("Please confirm you have read the shared-account rules.");
      return;
    }
    if (isInvite && isGame && inviteEmail.trim().length < 3) {
      setErr("Please enter your Player ID.");
      return;
    }
    if (isInvite && !isGame && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setErr(`Please enter the email address of your ${product.name} account.`);
      return;
    }

    submitting.current = true;
    setBusy(true);
    setErr(null);

    // Upload the receipt first — if storage fails there is no half-made order.
    let receiptPath: string | null = null;
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      submitting.current = false;
      setErr("Your session expired. Please sign in again.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${auth.user.id}/sub-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
    if (uploadError) {
      setBusy(false);
      submitting.current = false;
      setErr("Receipt upload failed: " + uploadError.message);
      return;
    }
    receiptPath = path;

    const res = await callApi("/api/subscriptions/order", "POST", {
      planId: plan.id,
      method: "bkash",
      txnRef: txnRef.trim(),
      senderNumber: senderNumber.trim() || null,
      receiptPath,
      inviteEmail: isInvite ? inviteEmail.trim().toLowerCase() : null,
    });

    setBusy(false);
    submitting.current = false;

    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  if (done) {
    return (
      <div className="shell py-16">
        <div className="mb-10">
          <CheckoutSteps current={3} />
        </div>
        <div className="card mx-auto max-w-lg p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e5243b]/15 text-2xl text-[#e5243b]">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-black">Payment submitted</h1>
          <p className="muted mt-3 leading-7">
            {isGame ? (
              <>
                We are verifying your transaction. Once it clears, we top up Player ID{" "}
                <b className="text-white">{inviteEmail}</b> directly — usually within minutes.
                You will see the {product.name} land in your game.
              </>
            ) : isManaged ? (
              <>
                We are verifying your transaction. Once it clears, we message you on WhatsApp
                to activate <b className="text-white">{inviteEmail}</b> — usually within a few
                hours. You send your password there (never on this site), we switch on the plan
                and turn off auto-renew, then you can change your password right away.
              </>
            ) : isInvite ? (
              <>
                We are verifying your transaction. Once it clears, we send the {product.name}{" "}
                invite to <b className="text-white">{inviteEmail}</b> — usually within a few
                hours. Accept it from your inbox and premium turns on.
              </>
            ) : (
              <>
                We are verifying your transaction. Once it clears, your {product.name} login
                appears in your dashboard — usually within a few hours.
              </>
            )}
          </p>
          {isManaged && WHATSAPP_SUPPORT && (
            <a
              href={`https://wa.me/${WHATSAPP_SUPPORT}?text=${encodeURIComponent(
                `Hi, I just paid for ${product.name} (${plan.name}). My account email is ${inviteEmail}.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/[.10] px-5 py-3 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/[.16]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.516 5.26l-.999 3.648 3.472-.91zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.074-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Message us on WhatsApp to activate
            </a>
          )}
          <div className="mt-5">
            <Link href="/dashboard" className="btn-primary inline-block">
              Go to my subscriptions →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-12">
      <div className="mb-10 text-center">
        <Link
          href={`/subscriptions/${product.slug}`}
          className="muted mb-7 inline-block text-sm hover:text-white"
        >
          ← Back to {product.name}
        </Link>
        <CheckoutSteps current={2} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        {/* ---------------- order summary ---------------- */}
        <section>
          <p className="eyebrow">Secure checkout</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Confirm your subscription.
          </h1>
          <p className="muted mt-3 max-w-xl leading-7">
            Send the exact amount, then give us the transaction ID. We verify every payment
            by hand before activating access.
          </p>

        <div className="card mt-8 overflow-hidden">
          <div className="border-b border-white/[.06] bg-gradient-to-r from-[#e5243b]/10 to-transparent p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge badge-neutral">
                  {isShared ? "Shared account" : "Personal account"}
                </span>
                <h2 className="mt-3 text-2xl font-black">{product.name}</h2>
                <p className="muted mt-1">
                  {plan.name} · {describeDuration(plan.duration_days)}
                </p>
              </div>
              <div className="text-right">
                <span className="muted text-xs font-bold">BDT</span>
                {plan.compare_at_bdt && (
                  <s className="muted block text-sm">{formatBdt(plan.compare_at_bdt)}</s>
                )}
                <b className="block text-4xl font-black text-[#e5243b]">
                  {formatBdt(plan.price_bdt)}
                </b>
                {off ? <span className="text-xs font-bold text-[#ff8f9b]">−{off}% off</span> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <div className="text-sm">
              <p className="muted text-xs">Starts</p>
              <p className="font-bold text-white">once verified</p>
            </div>
            <div className="text-sm">
              <p className="muted text-xs">Valid until (approx.)</p>
              <p className="font-bold text-white">{formatDhakaDate(expiry)}</p>
            </div>
          </div>

          {product.features.length > 0 && (
            <div className="grid gap-2 border-t border-white/[.06] p-6 sm:grid-cols-2">
              {product.features.slice(0, 6).map((f) => (
                <div key={f} className="flex gap-2 text-sm text-[#c7ccd6]">
                  <span className="shrink-0 text-[#ff7585]">✓</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {pendingOrder && (
          <div className="card mt-5 border border-[#ffb347]/30 p-5">
            <p className="font-bold text-[#ffcf8c]">You already have a payment under review</p>
            <p className="muted mt-2 text-sm leading-6">
              Submitted {formatDhakaDate(pendingOrder.created_at)}
              {pendingOrder.txn_ref ? ` · TxnID ${pendingOrder.txn_ref}` : ""}. There is no need
              to pay again — we will activate it as soon as it is verified.
            </p>
          </div>
        )}
      </section>

      {/* ---------------- payment form ---------------- */}
      <section className="card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Pay with bKash</h2>
          <span className="rounded-lg bg-[#e2136e] px-3 py-1 text-xs font-black text-white">
            bKash
          </span>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="rounded-xl border border-[#e2136e]/40 bg-[#e2136e]/10 p-4 text-sm leading-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#ff6ca5]">
                ⚠️ bKash instructions
              </span>
              <span className="rounded-md bg-[#e2136e] px-2 py-0.5 text-[10px] font-black text-white">
                PERSONAL (SEND MONEY)
              </span>
            </div>

            <p className="text-sm font-bold leading-relaxed text-[#ffd4e5]">
              অবশ্যই বিকাশের{" "}
              <b className="text-white underline underline-offset-4">Send Money (সেন্ড মানি)</b>{" "}
              অপশন ব্যবহার করে টাকা পাঠাবেন। (Merchant / Payment করা যাবে না)।
            </p>

            <div className="mt-3 grid gap-3 rounded-lg border border-[#e2136e]/30 bg-black/40 p-3 sm:grid-cols-2">
              <div>
                <span className="text-[11px] font-bold text-[#ff8ebc]">bKash number</span>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-base font-black text-[#ffc36f]">{bkashNumber}</p>
                  <button
                    type="button"
                    className="text-xs font-bold text-[#e5243b] underline"
                    onClick={async () => {
                      const ok = await copyToClipboard(bkashNumber);
                      setCopied(ok);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#ff8ebc]">Exact amount</span>
                <p className="font-mono text-base font-black text-[#e5243b]">
                  {formatBdt(plan.price_bdt)}
                </p>
              </div>
            </div>
          </div>

          {isInvite && (
            <div className="rounded-xl border border-[#e5243b]/30 bg-[#e5243b]/[.06] p-4">
              <label>
                <span className="label">
                  {isGame ? "Your Player ID" : `Your ${product.name} account email`}
                </span>
                <input
                  className="input font-mono"
                  type={isGame ? "text" : "email"}
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={isGame ? "e.g. 51234567890" : "you@example.com"}
                />
              </label>
              <p className="muted mt-2 text-xs leading-5">
                {isGame ? (
                  <>
                    Enter the Player ID of the account you want topped up — find it on your
                    in-game profile. After we verify your payment, we top up this ID directly,
                    usually within minutes. Double-check it: a wrong ID tops up the wrong account.
                  </>
                ) : isManaged ? (
                  <>
                    This must be the email you sign into {product.name} with. After payment we
                    message you on WhatsApp — you send your password there (never on this site),
                    and we activate the plan on your own account. If you do not have an account
                    yet, make a free one first — it takes a minute.
                  </>
                ) : (
                  <>
                    We send the invite to this address, so it must be the email you actually
                    sign into {product.name} with. If you do not have an account yet, make a free
                    one first — it takes a minute. A typo here means the invite goes nowhere.
                  </>
                )}
              </p>
            </div>
          )}

          <label>
            <span className="label">Transaction ID</span>
            <input
              className="input font-mono"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value.toUpperCase())}
              placeholder="e.g. BKH7X91Q2"
              required
            />
            <span className="muted mt-1 block text-xs">
              8–12 characters, from the confirmation SMS.
            </span>
          </label>

          <label>
            <span className="label">Your bKash number</span>
            <input
              className="input font-mono"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="numeric"
            />
            <span className="muted mt-1 block text-xs">
              Optional, but it makes verification much faster.
            </span>
          </label>

          <label className="block cursor-pointer">
            <span className="label mb-2 block">Payment screenshot</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_RECEIPT_BYTES) {
                  setErr("That screenshot is over 10MB. Please attach a smaller one.");
                  return;
                }
                setErr(null);
                setFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5243b]/50 bg-[#e5243b]/10 p-4 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl">📄</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{file.name}</p>
                    <p className="text-xs text-[#8fa896]">
                      {(file.size / 1024).toFixed(1)} KB · ready to upload
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-bold text-red-400 hover:text-red-300"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }}
                >
                  ✕ Change
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5243b]/30 bg-black/30 p-6 text-center transition-all hover:border-[#e5243b] hover:bg-[#e5243b]/5">
                <span className="mb-2 text-3xl text-[#e5243b]">📥</span>
                <p className="text-sm font-bold text-white">
                  Click to upload your bKash screenshot
                </p>
                <p className="muted mt-1 text-xs">PNG or JPG, up to 10MB</p>
              </div>
            )}
          </label>

          {isShared && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.08] bg-white/[.02] p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="text-sm leading-6 text-[#c7ccd6]">
                I understand this is a <b className="text-white">shared account</b>. I will not
                change the password or account settings, and I will not share my login with
                anyone else.
              </span>
            </label>
          )}

          {err && (
            <p className="rounded-lg border border-[#ff6b6b]/25 bg-[#ff6b6b]/[.07] p-3 text-sm text-[#ff9d9d]">
              {err}
            </p>
          )}

          {/* Sticky so the amount and the button stay reachable on a phone,
              where the form is taller than the screen. */}
          <div className="checkout-total">
            <div className="mb-3 flex items-center justify-between">
              <span className="muted text-[11px] font-bold uppercase tracking-[0.1em]">
                Total
              </span>
              <span className="text-2xl font-black text-white">
                {formatBdt(plan.price_bdt)}
              </span>
            </div>
            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Submitting…" : "Submit payment →"}
            </button>
            <p className="muted mt-3 text-center text-xs">
              🔐 We never ask for your PIN or OTP.
            </p>
          </div>
        </form>
        </section>
      </div>
    </div>
  );
}
