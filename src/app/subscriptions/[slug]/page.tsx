import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { SubPlanPicker } from "@/components/SubPlanPicker";

export const dynamic = "force-dynamic";

async function loadProduct(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sub_products")
    .select(
      "id, slug, name, tagline, description, thumbnail_url, category, access_type, delivery_type, login_url, features, terms_note, is_active, sub_plans(id, name, duration_days, price_bdt, compare_at_bdt, is_active, sort_order)",
    )
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await loadProduct(params.slug);
  if (!product) return { title: "Subscription — Subsdealer" };
  return {
    title: `${product.name} — Subsdealer`,
    description: product.tagline ?? product.description ?? undefined,
  };
}

export default async function SubscriptionProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const [product, user] = await Promise.all([loadProduct(params.slug), getSessionUser()]);

  if (!product || !product.is_active) notFound();

  const plans = ((product as any).sub_plans ?? [])
    .filter((p: any) => p.is_active)
    .sort((a: any, b: any) => a.sort_order - b.sort_order || a.duration_days - b.duration_days);

  const features: string[] = Array.isArray(product.features) ? product.features : [];
  const isInvite = (product as any).delivery_type === "invite";
  // Invite delivery means the customer keeps their own account and password,
  // so none of the shared-login warnings apply to it.
  const isShared = product.access_type === "shared" && !isInvite;
  const thumbnailUrl = product.thumbnail_url || `/products/${product.slug}.png`;
  const coverUrl = product.slug.startsWith("valorant")
    ? `/products/${product.slug}-banner.png`
    : thumbnailUrl;

  return (
    <div className="shell py-12">
      <Link href="/subscriptions" className="muted text-sm hover:text-white">
        ← All subscriptions
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          {/* Top Cover Banner Image (RMT Game Shop style) */}
          {coverUrl && (
            <div className="mb-6 relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#121620] shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="flex items-start gap-5">
            <div
              className="product-logo h-20 w-20 rounded-2xl text-2xl"
              data-image={thumbnailUrl ? "yes" : "no"}
            >
              {thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" />
              ) : (
                product.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
              {product.tagline && <p className="muted mt-2 text-lg leading-8">{product.tagline}</p>}

              {/* RMT Game Shop style Left-Side Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-blue-400 border border-blue-500/20">
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1.8L3 4.5v5c0 4.6 3.1 8.9 7 9.8 3.9-.9 7-5.2 7-9.8v-5l-7-2.7zm3.7 6.9l-4.2 4.2a1 1 0 01-1.4 0L6.3 11a1 1 0 111.4-1.4l1.1 1.1 3.5-3.5a1 1 0 111.4 1.4z" clipRule="evenodd" />
                  </svg>
                  Safety Guarantee
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-400 border border-amber-500/20">
                  ⚡ Instant Delivery
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-emerald-400 border border-emerald-500/20">
                  🌐 Global Region
                </span>
              </div>
            </div>
          </div>

          {product.description && (
            <p className="muted mt-7 whitespace-pre-line leading-8">{product.description}</p>
          )}

          {features.length > 0 && (
            <div className="card mt-8 p-6">
              <h2 className="font-black text-white">What you get</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-6 text-[#c7ccd6]">
                    <span className="shrink-0 text-[#ff7585]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invite delivery surprises people who expect a password in their
              inbox, so the steps are spelled out before they pay. */}
          {isInvite && (
            <div className="card mt-8 border border-[#e5243b]/25 p-6">
              <h2 className="font-black text-white">How you get it</h2>
              <ol className="mt-4 space-y-3">
                {[
                  ["Pay with bKash", "Pick a plan and submit your transaction ID."],
                  [
                    `Give us your ${product.name} email`,
                    "At checkout, enter the email you sign into your own account with.",
                  ],
                  ["We send an invite", "Usually within a few hours of verifying the payment."],
                  [
                    "Accept it from your inbox",
                    "Premium switches on. Your account, your password, your files.",
                  ],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#e5243b]/10 text-xs font-black text-[#e5243b]">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-6 text-[#c7ccd6]">
                      <b className="text-white">{title}</b> — {body}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="muted mt-4 border-t border-white/[.06] pt-4 text-sm leading-6">
                You never receive a password and never share one. If you do not have an account
                yet, create a free one first so we have somewhere to send the invite.
              </p>
              {product.terms_note && (
                <p className="muted mt-3 whitespace-pre-line text-sm leading-6">
                  {product.terms_note}
                </p>
              )}
            </div>
          )}

          {/* Spelling out the shared-account rules before purchase is what
              keeps refund arguments and support tickets down. */}
          {isShared && (
            <div className="card mt-6 border border-[#ffb347]/25 p-6">
              <h2 className="font-black text-[#ffcf8c]">Read this before you buy</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#c7ccd6]">
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#ffcf8c]">•</span>
                  This is a shared team account. Several people use it at once.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#ffcf8c]">•</span>
                  Do not change the password, email, or any account settings — it locks
                  everyone else out and ends your access.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#ffcf8c]">•</span>
                  Do not share your login with anyone else.
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-[#ffcf8c]">•</span>
                  If the provider resets the account, we move you to a fresh login and your
                  dashboard updates automatically.
                </li>
              </ul>
              {product.terms_note && (
                <p className="muted mt-4 whitespace-pre-line border-t border-white/[.06] pt-4 text-sm leading-6">
                  {product.terms_note}
                </p>
              )}
            </div>
          )}

          {!isShared && !isInvite && product.terms_note && (
            <div className="card mt-6 p-6">
              <h2 className="font-black text-white">Good to know</h2>
              <p className="muted mt-3 whitespace-pre-line text-sm leading-6">
                {product.terms_note}
              </p>
            </div>
          )}
        </section>

        <section>
          {plans.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-bold text-white">Not available right now</p>
              <p className="muted mt-2 text-sm">
                This product has no active plans. Get in touch and we will let you know when it
                is back.
              </p>
              <Link href="/contact" className="btn-secondary mt-5 inline-block">
                Contact us
              </Link>
            </div>
          ) : (
            <SubPlanPicker
              plans={plans}
              productName={product.name}
              features={features}
              signedIn={Boolean(user)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
