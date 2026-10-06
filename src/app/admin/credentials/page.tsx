import { createAdminClient } from "@/lib/supabase/admin";
import { SubCredentialsManager } from "@/components/SubCredentialsManager";
import { AdminAccountAssigner } from "@/components/AdminAccountAssigner";
import { hasEncryptionKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function SubCredentialsPage() {
  const svc = createAdminClient();

  // sub_credential_usage gives seat counts without exposing password_enc.
  // The passwords themselves are fetched one at a time, on demand, through
  // /api/admin/sub/reveal-credential — which logs every single view.
  const [productsRes, teamsRes, usageRes, detailRes] = await Promise.all([
    svc.from("sub_products").select("id, name, access_type, delivery_type").order("sort_order"),
    svc.from("sub_teams").select("id, name, product_id, capacity").eq("is_active", true).order("name"),
    svc.from("sub_credential_usage").select("*"),
    svc.from("sub_credentials").select("id, login_url, extra_notes"),
  ]);

  const detail = new Map((detailRes.data ?? []).map((d: any) => [d.id, d]));

  const credentials = (usageRes.data ?? [])
    .map((u: any) => ({
      ...u,
      login_url: detail.get(u.credential_id)?.login_url ?? null,
      extra_notes: detail.get(u.credential_id)?.extra_notes ?? null,
    }))
    .sort((a: any, b: any) => {
      // Revoked last, then the ones with free seats first — that is the
      // order you want when you are looking for somewhere to put a customer.
      if (a.status !== b.status) {
        if (a.status === "revoked") return 1;
        if (b.status === "revoked") return -1;
      }
      if (a.free_slots !== b.free_slots) return b.free_slots - a.free_slots;
      return a.login_email.localeCompare(b.login_email);
    });

  const error = productsRes.error || teamsRes.error || usageRes.error || detailRes.error;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Credential Pool</p>
        <h1 className="mt-2 text-3xl font-black">Credentials & Subscription Accounts</h1>
        <p className="muted mt-2 max-w-2xl">
          The actual logins and shared subscription email accounts you hand out to customers.
        </p>
      </div>

      {error && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load credentials</p>
          <p className="muted mt-2 text-sm">{error.message}</p>
        </div>
      )}

      {/* Admin Account Assigner Component */}
      <AdminAccountAssigner />

      <SubCredentialsManager
        products={(productsRes.data ?? []) as any[]}
        teams={(teamsRes.data ?? []) as any[]}
        credentials={credentials as any[]}
        encryptionReady={hasEncryptionKey()}
      />
    </div>
  );
}
