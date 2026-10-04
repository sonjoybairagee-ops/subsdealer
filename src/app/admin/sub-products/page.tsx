import { createAdminClient } from "@/lib/supabase/admin";
import { SubProductsManager } from "@/components/SubProductsManager";

export const dynamic = "force-dynamic";

export default async function SubProductsPage() {
  const svc = createAdminClient();

  const { data, error } = await svc
    .from("sub_products")
    .select("*, sub_plans(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const products = (data ?? []) as any[];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Subscription Store</p>
        <h1 className="mt-2 text-3xl font-black">Subscription products &amp; pricing</h1>
        <p className="muted mt-2 max-w-2xl">
          The services you resell — Adobe, Canva, ChatGPT and so on — plus the duration plans
          customers can buy.
        </p>
      </div>

      {error && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">Could not load products</p>
          <p className="muted mt-2 text-sm">{error.message}</p>
          <p className="muted mt-2 text-sm">
            If this mentions a missing relation, the subscription migration has not been pushed
            yet. Run <code className="font-mono">npm run db:push</code>.
          </p>
        </div>
      )}

      <SubProductsManager products={products} />
    </div>
  );
}
