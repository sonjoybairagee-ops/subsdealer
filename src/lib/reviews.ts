/**
 * Customer reviews shown on the home page.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  THESE ARE PLACEHOLDERS. REPLACE THEM WITH REAL ONES BEFORE GOING LIVE.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Publishing invented testimonials as if they came from real customers is
 * dishonest, and in many places it is also illegal — Bangladesh's Consumer
 * Rights Protection Act covers misleading representations, and the same goes
 * for the ad rules on Facebook and Google if you ever run ads pointing here.
 *
 * Until you have real ones, the safest move is to leave this array empty.
 * The section then hides itself completely instead of shipping fake praise.
 *
 * To collect real reviews: after a subscription has been active for a week,
 * message the customer and ask. Keep their permission along with the quote.
 */

export interface Review {
  /** The customer's own words. Do not polish them into marketing copy. */
  quote: string;
  /** First name plus an initial is plenty, and keeps their privacy. */
  name: string;
  /** What they bought, so the review has context. */
  product: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export const REVIEWS: Review[] = [
  // ── EXAMPLES ONLY — delete these and add real quotes ──────────────────
  // {
  //   quote: "Paid at night, invite came the next morning. Works on my own account.",
  //   name: "Rahim A.",
  //   product: "Canva Pro",
  //   rating: 5,
  // },
];

/** Shown next to the star rating. Keep it honest — count what you actually have. */
export const REVIEW_SUMMARY = {
  average: REVIEWS.length
    ? REVIEWS.reduce((sum, r) => sum + r.rating, 0) / REVIEWS.length
    : 0,
  count: REVIEWS.length,
};
