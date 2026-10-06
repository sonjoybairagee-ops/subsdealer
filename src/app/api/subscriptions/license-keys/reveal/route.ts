import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptLicenseKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  licenseKeyId: z.string().uuid("Valid licenseKeyId is required"),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request payload" },
      { status: 400 }
    );
  }

  const { licenseKeyId } = parsed.data;
  const adminClient = createAdminClient();

  // Query license key using admin client with strict ownership & assigned status verification
  const { data: keyRecord, error } = await adminClient
    .from("license_keys")
    .select("id, license_key_enc, order_id, product_id")
    .eq("id", licenseKeyId)
    .eq("user_id", user.id)
    .eq("status", "assigned")
    .single();

  if (error || !keyRecord) {
    return NextResponse.json(
      { error: "License key not found or access denied." },
      { status: 404 }
    );
  }

  // Decrypt on the server
  let serialKey: string;
  try {
    serialKey = decryptLicenseKey(keyRecord.license_key_enc);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to decrypt license key. Decryption key mismatch." },
      { status: 500 }
    );
  }

  // Record audit log event in sub_events
  await adminClient.from("sub_events").insert({
    event_type: "LICENSE_KEY_VIEWED",
    user_id: user.id,
    order_id: keyRecord.order_id,
    payload: {
      license_key_id: keyRecord.id,
      product_id: keyRecord.product_id,
      viewed_at: new Date().toISOString(),
    },
  });

  const response = NextResponse.json({ serialKey });
  response.headers.set("Cache-Control", "no-store, private");
  return response;
}
