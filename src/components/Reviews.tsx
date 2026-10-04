import Link from "next/link";
import { REVIEWS, REVIEW_SUMMARY } from "@/lib/reviews";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

/**
 * Customer reviews.
 *
 * The section always renders. When there are no real reviews yet it shows an
 * honest empty state rather than invented quotes — a site with no reviews and
 * an open invitation to be the first reads as new, which is fine. A site with
 * fabricated praise reads as trustworthy right up until someone checks.
 *
 * Add real ones in src/lib/reviews.ts.
 */
export function Reviews() {
  const hasReviews = REVIEWS.length > 0;

  return (
    <section id="reviews" className="shell scroll-mt-24 py-16">
      <div className="text-center">
        <span className="section-pill">★ Customer stories</span>
        <h2 className="section-title mt-6">
          {hasReviews ? "Real reviews from" : "Reviews from"}
          <em>{hasReviews ? "happy customers" : "real customers only"}</em>
        </h2>
        <p className="muted mx-auto mt-5 max-w-xl text-lg leading-8">
          {hasReviews
            ? "What people say after actually using what they bought."
            : `${BRAND} is new, so there is nothing here yet. Every review on this page will come from a real order — we do not write our own.`}
        </p>
      </div>

      {hasReviews ? (
        <>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((review, i) => (
              <figure key={`${review.name}-${i}`} className="review-card">
                <span className="review-stars" aria-label={`${review.rating} out of 5`}>
                  {"★".repeat(review.rating)}
                  <span className="text-[#3a3a42]">{"★".repeat(5 - review.rating)}</span>
                </span>

                <blockquote className="flex-1 leading-7 text-[#c7c9d2]">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>

                <figcaption className="flex items-center gap-3 border-t border-white/[.06] pt-4">
                  <span className="review-avatar" aria-hidden="true">
                    {review.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-white">{review.name}</span>
                    <span className="muted block truncate text-xs">{review.product}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="muted text-sm">Join our customers</p>
            <p className="mt-2 text-lg">
              <span className="review-stars text-base">
                {"★".repeat(Math.round(REVIEW_SUMMARY.average))}
              </span>{" "}
              <b className="text-white">{REVIEW_SUMMARY.average.toFixed(1)}/5</b>{" "}
              <span className="muted">
                from {REVIEW_SUMMARY.count} review{REVIEW_SUMMARY.count === 1 ? "" : "s"}
              </span>
            </p>
            <Link href="/subscriptions" className="btn-primary mt-7 inline-flex">
              Browse subscriptions →
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-12">
          {/* Three placeholder cards so the section has shape, clearly marked
              as empty rather than dressed up as testimonials. */}
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="review-card items-center justify-center border-dashed py-12 text-center"
                aria-hidden="true"
              >
                <span className="review-stars opacity-25">★★★★★</span>
                <p className="muted text-sm">Waiting for the first review</p>
              </div>
            ))}
          </div>

          <div className="card mt-8 flex flex-wrap items-center justify-between gap-5 p-7">
            <div>
              <p className="font-black text-white">Be the first</p>
              <p className="muted mt-1 max-w-md text-sm leading-6">
                Buy a plan, use it for a week, and tell us how it went. We will put your
                words here with your name — nothing invented, nothing polished.
              </p>
            </div>
            <Link href="/subscriptions" className="btn-primary">
              Browse subscriptions →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
