import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Opens a customer's bKash receipt for an admin.
 *
 * The receipts bucket is private, so this mints a short-lived signed URL and
 * redirects to it rather than making the bucket public — a public bucket
 * would expose every customer's payment screenshot to anyone who guessed a
 * filename.
 */
export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const path = new URL(req.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .storage.from("receipts")
    .createSignedUrl(path, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Receipt not found" },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
