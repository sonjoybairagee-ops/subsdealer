import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * SERVER ONLY. Uses the service role key and bypasses Row Level Security.
 *
 * Never import this into a Client Component. Every call made with it has
 * already had its own permission check — `requireAdmin()` for admin routes,
 * an explicit `user_id` comparison for customer routes.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Append-only audit of what an admin did. Deliberately never receives a
 * password or a ciphertext — only ids, emails and counts.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string | null,
  details?: Record<string, any>,
) {
  try {
    const svc = createAdminClient();
    await svc.from("admin_logs").insert({
      admin_id: adminId,
      action,
      target_id: targetId ?? null,
      details: details ?? {},
    });
  } catch (err) {
    // An audit write must never break the action it was recording.
    console.error("[admin_logs] failed to record", action, err);
  }
}
