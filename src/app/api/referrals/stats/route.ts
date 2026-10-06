import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile for referral code
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("referral_code, wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch referral count
    const { count: referredCount, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);

    // Fetch total commissions earned
    const { data: commissions, error: commError } = await supabase
      .from("referral_commissions")
      .select("amount")
      .eq("referrer_id", user.id);

    const totalEarned = (commissions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://subsdealer.com";
    const referralLink = `${siteUrl}/?ref=${profile.referral_code}`;

    return NextResponse.json({
      success: true,
      referral_code: profile.referral_code,
      referral_link: referralLink,
      referred_count: referredCount || 0,
      total_earned: totalEarned,
      wallet_balance: profile.wallet_balance || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch referral stats" }, { status: 500 });
  }
}
