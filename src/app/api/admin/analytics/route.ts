import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("range") || "30d"; // 7d, 30d, all

    let fromDate: string | null = null;
    const now = new Date();

    if (filter === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      fromDate = d.toISOString();
    } else if (filter === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      fromDate = d.toISOString();
    }

    const supabase = createAdminClient();

    // Call atomic admin_analytics RPC
    const { data: analyticsData, error: rpcError } = await supabase.rpc("admin_analytics", {
      p_from: fromDate,
      p_to: null,
    });

    // Fallback SQL query if RPC isn't deployed yet
    let stats = analyticsData || {
      gross_sales: 0,
      product_costs: 0,
      orders_count: 0,
      referral_payouts: 0,
      net_profit: 0,
      active_subscribers: 0,
    };

    if (rpcError || !analyticsData) {
      let ordersQuery = supabase.from("sub_orders").select("amount_bdt, cost_price_bdt").eq("status", "approved");
      if (fromDate) ordersQuery = ordersQuery.gte("created_at", fromDate);

      const { data: orders } = await ordersQuery;

      let commQuery = supabase.from("referral_commissions").select("amount");
      if (fromDate) commQuery = commQuery.gte("created_at", fromDate);
      const { data: comms } = await commQuery;

      const { count: activeSubs } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expiry_date", new Date().toISOString());

      const grossSales = (orders || []).reduce((s, o) => s + Number(o.amount_bdt || 0), 0);
      const productCosts = (orders || []).reduce((s, o) => s + Number(o.cost_price_bdt || 0), 0);
      const referralPayouts = (comms || []).reduce((s, c) => s + Number(c.amount || 0), 0);

      stats = {
        gross_sales: grossSales,
        product_costs: productCosts,
        orders_count: (orders || []).length,
        referral_payouts: referralPayouts,
        net_profit: grossSales - productCosts - referralPayouts,
        active_subscribers: activeSubs || 0,
      };
    }

    // Fetch Recent Approved Orders
    const { data: recentOrders } = await supabase
      .from("sub_orders")
      .select("id, amount_bdt, status, created_at, user_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      range: filter,
      stats,
      recentOrders: recentOrders || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch analytics" }, { status: 500 });
  }
}
