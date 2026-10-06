import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptLicenseKey, hashLicenseKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().uuid("Valid productId is required"),
  licenseKeys: z.array(z.string().trim().min(1)).min(1, "At least one license key is required"),
});

export async function POST(req: Request) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload" },
      { status: 400 }
    );
  }

  const { productId, licenseKeys } = parsed.data;
  const adminClient = createAdminClient();

  const insertedKeys: string[] = [];
  const duplicates: string[] = [];

  for (const rawKey of licenseKeys) {
    const keyHash = hashLicenseKey(rawKey);
    const encKey = encryptLicenseKey(rawKey);

    const { error } = await adminClient.from("license_keys").insert({
      product_id: productId,
      license_key_enc: encKey,
      key_hash: keyHash,
      status: "available",
    });

    if (error) {
      if (error.code === "23505") {
        duplicates.push(rawKey);
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      insertedKeys.push(rawKey);
    }
  }

  return NextResponse.json({
    message: `Successfully uploaded ${insertedKeys.length} license key(s).`,
    insertedCount: insertedKeys.length,
    duplicateCount: duplicates.length,
    duplicates,
  });
}
