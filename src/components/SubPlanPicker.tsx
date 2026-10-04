"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { describeDuration, discountPercent, formatBdt, type SubPlan } from "@/lib/subscriptions";

/**
 * Plan selector on a product page. Purely a navigation step — nothing is
 * charged or reserved here, it just carries the chosen plan to checkout.
 */
export function SubPlanPicker({
  plans,
  productName,
  features,
  signedIn,
}: {
  plans: SubPlan[];
  productName: string;
  features: string[];
  signedIn: boolean;
}) {
  // Default to the best value per day rather than the lowest sticker price —
  // that is the plan most people end up choosing anyway.
  const bestValueId = useMemo(() => {
    let best = plans[0];
    for (const p of plans) {
      if (Number(p.price_bdt) / p.duration_days < Number(best.price_bdt) / best.duration_days) {
        best = p;
      }
    }
    return best?.id;
  }, [plans]);

  const [selectedId, setSelectedId] = useState(bestValueId ?? plans[0]?.id);
  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  const selPrice = Number(selected.price_bdt);
  const selCompare = selected.compare_at_bdt ? Number(selected.compare_at_bdt) : null;
  const selOff = discountPercent(selPrice, selCompare);

  return (
    <div className="card sticky top-24 overflow-hidden">
      <div className="border-b border-white/[.06] p-6 text-center">
        <p className="eyebrow">Choose your plan</p>
        <h2 className="mt-2 text-xl font-black text-white">{productName}</h2>
      </div>

      {/* ---- plan tiles ---- */}
      <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-3">
        {plans.map((plan) => {
          const price = Number(plan.price_bdt);
          const compareAt = plan.compare_at_bdt ? Number(plan.compare_at_bdt) : null;
          const isSelected = plan.id === selectedId;

          return (
            <button
              key={plan.id}
              type="button"
              className="plan-tile"
              aria-pressed={isSelected}
              onClick={() => setSelectedId(plan.id)}
            >
              <span className="plan-tile-label">{plan.name}</span>
              <span className="mt-1.5 block text-lg font-black text-white">
                {formatBdt(price)}
              </span>
              {compareAt && (
                <s className="block text-xs text-[#6b7280]">{formatBdt(compareAt)}</s>
              )}
            </button>
          );
        })}
      </div>

      {/* ---- big price ---- */}
      <div className="border-t border-white/[.06] px-6 py-7 text-center">
        <p className="text-5xl font-black tracking-tight text-[#e5243b]">
          {formatBdt(selPrice)}
        </p>
        {selCompare && (
          <s className="mt-1 block text-lg text-[#6b7280]">{formatBdt(selCompare)}</s>
        )}
        <p className="muted mt-3 text-sm font-bold">
          {/* Plan names are usually already the duration ("12 Months"), so
              only add the computed one when it actually says something new. */}
          {selected.name}
          {describeDuration(selected.duration_days) !== selected.name
            ? ` · ${describeDuration(selected.duration_days)}`
            : ""}
          {selOff ? (
            <span className="ml-2 text-[#ff8f9b]">save {selOff}%</span>
          ) : null}
        </p>
      </div>

      {/* ---- what's included ---- */}
      {features.length > 0 && (
        <div className="border-t border-white/[.06] p-6">
          <p className="label">What&rsquo;s included</p>
          <ul className="mt-3 space-y-2">
            {features.slice(0, 6).map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-6 text-[#c7ccd6]">
                <span className="shrink-0 text-[#ff7585]">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- cta ---- */}
      <div className="border-t border-white/[.06] p-6">
        {signedIn ? (
          <Link
            href={`/subscriptions/checkout/${selected.id}`}
            className="btn-primary block w-full text-center"
          >
            Continue to payment →
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn-primary block w-full text-center">
              Sign in to continue →
            </Link>
            <p className="muted mt-3 text-center text-xs leading-5">
              You need an account so your login details have somewhere private to live.{" "}
              <Link href="/signup" className="text-[#e5243b] underline">
                Create one
              </Link>
            </p>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#c7ccd6]">
          <span>
            <span className="text-[#ff7585]">✓</span> bKash
          </span>
          <span>
            <span className="text-[#ff7585]">✓</span> Verified by a human
          </span>
          <span>
            <span className="text-[#ff7585]">✓</span> Free replacement
          </span>
        </div>
      </div>
    </div>
  );
}
