import { createAdminClient } from "@/lib/supabase/admin";
import { SubTeamsManager } from "@/components/SubTeamsManager";

export const dynamic = "force-dynamic";

export default async function SubTeamsPage() {
  const svc = createAdminClient();

  const [productsRes, teamsRes, usageRes, credsRes] = await Promise.all([
    svc.from("sub_products").select("id, name, access_type").order("sort_order"),
    svc.from("sub_teams").select("*").order("created_at", { ascending: true }),
    svc.from("sub_team_usage").select("*"),
    svc.from("sub_credentials").select("id, team_id").neq("status", "revoked"),
  ]);

  const usageByTeam = new Map((usageRes.data ?? []).map((u: any) => [u.team_id, u]));
  const credCount = new Map<string, number>();
  for (const c of credsRes.data ?? []) {
    if (!c.team_id) continue;
    credCount.set(c.team_id, (credCount.get(c.team_id) ?? 0) + 1);
  }

  const teams = (teamsRes.data ?? []).map((t: any) => ({
    ...t,
    usage: usageByTeam.get(t.id) ?? null,
    credentialCount: credCount.get(t.id) ?? 0,
  }));

  const error = productsRes.error || teamsRes.error || usageRes.error || credsRes.error;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Shared Account Groups</p>
        <h1 className="mt-2 text-3xl font-black">Teams</h1>
        <p className="muted mt-2 max-w-2xl">
          Each team is one shared account group with a seat limit. Capacity should match the
          real limit on the account — and staying well under it means fewer customers are
          affected if a provider flags the account.
        </p>
      </div>

      {error && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load teams</p>
          <p className="muted mt-2 text-sm">{error.message}</p>
        </div>
      )}

      <SubTeamsManager products={(productsRes.data ?? []) as any[]} teams={teams} />
    </div>
  );
}
