import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

/**
 * SERVER ONLY. Symmetric encryption for subscription credentials.
 *
 * Never import this into a Client Component, and never return
 * decryptSecret() output from anything that is not behind an
 * ownership check. The encryption key lives in CREDENTIAL_ENC_KEY
 * and must never be exposed with a NEXT_PUBLIC_ prefix.
 *
 * Stored format:  base64(iv) ":" base64(authTag) ":" base64(ciphertext)
 *
 * AES-256-GCM is authenticated, so a tampered ciphertext throws on
 * decrypt rather than returning garbage. The DB has a CHECK
 * constraint on this three-segment shape, which also means a
 * plaintext password can never be written to the column by accident.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32; // AES-256

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CREDENTIAL_ENC_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENC_KEY is not set. Generate one with `openssl rand -hex 32` " +
        "and add it to .env.local and your Vercel environment variables.",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    throw new Error(
      "CREDENTIAL_ENC_KEY must be exactly 64 hex characters (32 bytes). " +
        "Generate one with `openssl rand -hex 32`.",
    );
  }

  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(`CREDENTIAL_ENC_KEY decoded to ${key.length} bytes, expected ${KEY_BYTES}.`);
  }

  cachedKey = key;
  return key;
}

/** True when the key is present and well formed. Use this in health checks. */
export function hasEncryptionKey(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypt a plaintext secret for storage in sub_credentials.password_enc. */
export function encryptSecret(plain: string): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("encryptSecret: refusing to encrypt an empty value");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64")).join(":");
}

/**
 * Decrypt a stored secret. Throws if the key is wrong or the
 * ciphertext was tampered with — never returns a partial result.
 */
export function decryptSecret(stored: string): string {
  if (typeof stored !== "string") {
    throw new Error("decryptSecret: expected a string");
  }

  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("decryptSecret: malformed ciphertext (expected iv:tag:data)");
  }

  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64"));
  if (iv.length !== IV_BYTES) {
    throw new Error(`decryptSecret: bad iv length (${iv.length})`);
  }
  if (tag.length !== 16) {
    throw new Error(`decryptSecret: bad auth tag length (${tag.length})`);
  }

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, or someone edited the row. Do not leak which.
    throw new Error(
      "decryptSecret: authentication failed. The CREDENTIAL_ENC_KEY does not match " +
        "the one used to encrypt this credential, or the row was modified.",
    );
  }
}

/** Shape check without needing the key — handy for validation layers. */
export function looksEncrypted(value: string): boolean {
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Admin-list display helper: "ab••••••yz". Shows enough to tell two
 * credentials apart without putting the password on screen.
 */
export function maskSecret(plain: string): string {
  if (plain.length <= 4) return "•".repeat(8);
  return `${plain.slice(0, 2)}${"•".repeat(Math.min(10, plain.length - 4))}${plain.slice(-2)}`;
}

export function hashLicenseKey(key: string): string {
  const { createHmac } = require("crypto");
  const secret = process.env.LICENSE_KEY_HASH_SECRET || process.env.CREDENTIAL_ENC_KEY || "default-subsdealer-license-key-hash-salt";
  const normalized = key.trim().toUpperCase();
  return createHmac("sha256", secret).update(normalized).digest("hex");
}

export function encryptLicenseKey(key: string): string {
  return encryptSecret(key.trim());
}

export function decryptLicenseKey(ciphertext: string): string {
  return decryptSecret(ciphertext);
}

/**
 * Constant-time compare for the cron secret and similar shared tokens.
 * Plain `===` on a secret leaks length and prefix through timing.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

