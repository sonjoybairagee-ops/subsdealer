/**
 * Shared types, labels and formatting for the subscription portal.
 *
 * Safe to import from both Server and Client Components — there is
 * nothing secret in here. Credential encryption lives in
 * src/lib/crypto.ts and must stay server-only.
 */

export type SubAccessType = "personal" | "shared";

/**
 * How the customer actually receives what they bought.
 *
 * "credential" — we hand over an email and password for an account we own.
 * "invite"     — we invite the customer's OWN account email into one of our
 *                team panels. They never see a password, because the panel
 *                password would let them remove every other member.
 */
export type SubDeliveryType = "credential" | "invite";

export type SubscriptionStatus =
  | "pending_credential"
  | "active"
  | "expired"
  | "revoked"
  | "paused";

export type SubOrderStatus = "pending" | "on_hold" | "approved" | "rejected";

export type SubCredentialStatus = "active" | "rotating" | "revoked";

export type SubPaymentMethod = "bkash" | "nagad" | "manual";

export interface SubProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  access_type: SubAccessType;
  delivery_type: SubDeliveryType;
  login_url: string | null;
  features: string[];
  terms_note: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubPlan {
  id: string;
  product_id: string;
  name: string;
  duration_days: number;
  price_bdt: number;
  compare_at_bdt: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface SubTeam {
  id: string;
  product_id: string;
  name: string;
  capacity: number;
  login_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

/** Row shape of public.sub_team_usage. */
export interface SubTeamUsage {
  team_id: string;
  product_id: string;
  name: string;
  capacity: number;
  is_active: boolean;
  active_members: number;
  free_slots: number;
}

/**
 * Row shape of public.sub_credential_usage.
 * Note what is absent: password_enc. The view never selects it.
 */
export interface SubCredentialUsage {
  credential_id: string;
  product_id: string;
  team_id: string | null;
  login_email: string;
  label: string | null;
  status: SubCredentialStatus;
  max_users: number;
  rotated_at: string | null;
  updated_at: string;
  active_users: number;
  free_slots: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  order_id: string | null;
  credential_id: string | null;
  team_id: string | null;
  start_date: string;
  expiry_date: string;
  status: SubscriptionStatus;
  invite_email: string | null;
  invited_at: string | null;
  revoked_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** What /api/subscriptions/reveal returns. Never persist this client-side. */
export interface RevealedCredential {
  email: string;
  password: string;
  loginUrl: string | null;
  team: string | null;
  notes: string | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Status presentation
// ---------------------------------------------------------------------------

type BadgeTone = "green" | "warn" | "danger" | "neutral";

const STATUS_META: Record<SubscriptionStatus, { label: string; tone: BadgeTone; hint: string }> = {
  active: {
    label: "Active",
    tone: "green",
    hint: "Your login is ready to use.",
  },
  pending_credential: {
    label: "Assigning",
    tone: "warn",
    hint: "Payment confirmed. We are assigning your login — usually within a few hours.",
  },
  expired: {
    label: "Expired",
    tone: "neutral",
    hint: "This subscription has ended. Renew to get a login again.",
  },
  revoked: {
    label: "Revoked",
    tone: "danger",
    hint: "Access was withdrawn. Contact support if you think this is a mistake.",
  },
  paused: {
    label: "Paused",
    tone: "warn",
    hint: "Temporarily on hold while we sort out the account.",
  },
};

export function subscriptionStatusMeta(status: SubscriptionStatus) {
  return STATUS_META[status] ?? { label: status, tone: "neutral" as BadgeTone, hint: "" };
}

/** Maps a tone onto the project's badge classes. */
export function badgeClass(tone: BadgeTone): string {
  return `badge badge-${tone === "green" ? "green" : tone}`;
}

const ORDER_STATUS_META: Record<SubOrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending review", tone: "warn" },
  on_hold: { label: "On hold", tone: "warn" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "danger" },
};

export function orderStatusMeta(status: SubOrderStatus) {
  return ORDER_STATUS_META[status] ?? { label: status, tone: "neutral" as BadgeTone };
}

/**
 * Customers can only pay by bKash. The other two exist so an admin can record
 * a payment taken some other way, and so historical rows keep rendering —
 * hence a lookup rather than a bKash/not-bKash ternary.
 */
const METHOD_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  manual: "Recorded manually",
};

export function paymentMethodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

/**
 * What an invite-delivered subscription is doing right now.
 *
 * A credential product is "ready" the moment a login is bound. An invite
 * product has a second step — somebody has to actually send the invite —
 * so it needs its own state, otherwise the customer sees "Active" and then
 * finds nothing in their inbox.
 */
export function inviteState(sub: {
  status: SubscriptionStatus;
  invite_email?: string | null;
  invited_at?: string | null;
}): { label: string; tone: "green" | "warn" | "danger" | "neutral"; hint: string } {
  if (sub.status === "expired" || sub.status === "revoked") {
    return {
      label: "Ended",
      tone: "neutral",
      hint: "This subscription has ended, so the invite no longer applies.",
    };
  }
  if (!sub.invite_email) {
    return {
      label: "Email needed",
      tone: "danger",
      hint: "We do not have an account email to invite. Please contact support with the email you use.",
    };
  }
  if (!sub.invited_at) {
    return {
      label: "Invite on the way",
      tone: "warn",
      hint: "Payment confirmed. We are sending your invite — usually within a few hours.",
    };
  }
  return {
    label: "Invite sent",
    tone: "green",
    hint: "Accept the invite from your inbox and premium turns on. Check your spam folder if you cannot find it.",
  };
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/**
 * Whole days left before expiry, floored at 0.
 *
 * Always feed this a server-rendered `now` where the answer matters —
 * a client clock can be wrong or deliberately rolled back. The real
 * expiry gate is /api/subscriptions/reveal, which re-checks on every
 * request; this is for display.
 */
export function daysRemaining(expiryDate: string | Date, now: Date = new Date()): number {
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS));
}

/** Fraction of the term already used, 0–1. Drives the progress bar. */
export function termProgress(
  startDate: string | Date,
  expiryDate: string | Date,
  now: Date = new Date(),
): number {
  const start = (typeof startDate === "string" ? new Date(startDate) : startDate).getTime();
  const end = (typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

export function isExpired(expiryDate: string | Date, now: Date = new Date()): boolean {
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  return expiry.getTime() <= now.getTime();
}

/** "01 Jan 2027" in Asia/Dhaka, which is what customers expect to see. */
export function formatDhakaDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(d);
}

/** "01 Jan 2027, 11:30 pm" — for audit tables. */
export function formatDhakaDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  }).format(d);
}

/** "2 days ago", "just now" — for "credential last updated". */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const then = (typeof value === "string" ? new Date(value) : value).getTime();
  const diff = now.getTime() - then;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** "৳2,499" — no decimals, because nobody prices subscriptions in poisha. */
export function formatBdt(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "৳0";
  return `৳${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

// ---------------------------------------------------------------------------
// Duration presets for the admin plan form
// ---------------------------------------------------------------------------

export const DURATION_PRESETS = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "12 Months", days: 365 },
] as const;

/** "90 days (~3 months)" for admin tables. */
export function describeDuration(days: number): string {
  // 1 day is our marker for a one-time / instant item (game top-ups, codes).
  if (days === 1) return "instant";
  const preset = DURATION_PRESETS.find((p) => p.days === days);
  if (preset) return preset.label;
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"}`;
  if (days % 30 === 0) return `${days / 30} months`;
  return `${days} days`;
}

export const PRODUCT_CATEGORIES = [
  "design",
  "ai",
  "video",
  "stock",
  "productivity",
  "education",
  "software",
  "games",
  "game_keys",
  "other",
] as const;

// ---------------------------------------------------------------------------
// Validation shared between the client forms and the API routes
// ---------------------------------------------------------------------------

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Turns "Adobe Creative Cloud" into "adobe-creative-cloud". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * bKash / Nagad transaction IDs. Same rule as the existing
 * /api/orders route so customers get consistent errors across the site:
 * 8–12 chars, and not all-digits or all-letters.
 */
export function isValidTxnRef(raw: string): boolean {
  const txn = raw.trim().toUpperCase();
  if (txn.length < 8 || txn.length > 12) return false;
  if (/^\d+$/.test(txn)) return false;
  if (/^[A-Z]+$/.test(txn)) return false;
  return /^[A-Z0-9]+$/.test(txn);
}

/**
 * Returns the best thumbnail URL for a product.
 * Prioritizes local 3:4 poster assets in /public/products/ for consistent storefront branding.
 */
export function getProductThumbnail(slug: string, dbThumbnailUrl?: string | null): string {
  const localSlugs = [
    "capcut-pro",
    "capcut-pro-private",
    "capcut",
    "canva-pro",
    "canva",
    "chatgpt-plus",
    "chatgpt-plus-shared",
    "chatgpt-go",
    "chatgpt",
    "pubg",
    "free-fire",
    "mobile-legends",
    "delta-force",
    "valorant",
    "valorant-my",
    "farlight-84",
    "gta-v",
    "rdr2",
    "adobe-creative-cloud",
    "microsoft-365",
    "duolingo-super",
    "quillbot-premium",
    "leonardo-ai",
    "windows-11",
    "windows-11-pro",
    "genshin-impact",
    "pubg-mobile-uc",
    "telegram-stars",
    "telegram-premium",
    "steam-wallet-global",
    "steam-wallet-us",
    "steam-wallet-tr",
    "roblox-global",
    "roblox-robux-us",
    "google-play-us",
    "google-play-tr",
    "playstation-us",
    "nintendo-us",
  ];

  const svgSlugs: string[] = [];

  if (svgSlugs.includes(slug)) {
    return `/products/${slug}.svg`;
  }

  if (localSlugs.includes(slug)) {
    return `/products/${slug}.png`;
  }

  return dbThumbnailUrl || `/products/${slug}.png`;
}

/**
 * Custom sort for Game Top-Up category cards according to requested serial order:
 * 1. PUBG Mobile UC
 * 2. Free Fire
 * 3. Mobile Legends: Bang Bang
 * 4. VALORANT
 * 5. All other games follow
 */
export function sortGameProducts<T extends { slug: string; name?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const getRank = (item: T) => {
      const s = (item.slug || "").toLowerCase();
      const n = (item.name || "").toLowerCase();
      if (s.includes("pubg") || n.includes("pubg")) return 1;
      if (s.includes("free-fire") || s.includes("freefire") || n.includes("free fire")) return 2;
      if (s.includes("mobile-legends") || s.includes("mlbb") || n.includes("mobile legends")) return 3;
      if (s.includes("valorant") || n.includes("valorant")) return 4;
      return 99;
    };
    return getRank(a) - getRank(b);
  });
}


