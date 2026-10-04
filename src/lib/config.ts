/**
 * Startup configuration check.
 *
 * Without this, a missing Supabase key surfaces as a raw stack trace from
 * deep inside the Supabase client on whatever page you happened to open.
 * Checking up front lets the app say plainly what is missing instead.
 */

export interface ConfigStatus {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

/** Treats placeholder values as missing — a half-filled file is still broken. */
function isSet(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  return !/^(your-|placeholder|xxx|changeme|change-me)/i.test(v);
}

export function checkConfig(): ConfigStatus {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!isSet(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Server-only keys are undefined in the browser bundle by design, so only
  // judge them when this runs on the server.
  if (typeof window === "undefined") {
    if (!isSet(process.env.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    const encKey = process.env.CREDENTIAL_ENC_KEY?.trim();
    if (!encKey) {
      warnings.push("CREDENTIAL_ENC_KEY is not set — credentials cannot be stored or read.");
    } else if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
      warnings.push(
        "CREDENTIAL_ENC_KEY must be 64 hex characters. Generate one with `openssl rand -hex 32`.",
      );
    }

    if (!isSet(process.env.CRON_SECRET)) {
      warnings.push("CRON_SECRET is not set — the daily expiry job will refuse to run.");
    }
  }

  return { ok: missing.length === 0, missing, warnings };
}
