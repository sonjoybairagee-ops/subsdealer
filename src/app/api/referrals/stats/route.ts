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
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, wallet_balance")
      .eq("id", user.id)
      .maybeSingle();

    let referralCode = profile?.referral_code;

    if (!referralCode) {
      // Auto-generate referral code if missing
      referralCode = `REF-${user.id.slice(0, 6).toUpperCase()}`;
      await supabase
        .from("profiles")
        .update({ referral_code: referralCode })
        .eq("id", user.id);
    }

    // Fetch referral count
    const { count: referredCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);

    // Fetch total commissions earned
    const { data: commissions } = await supabase
      .from("referral_commissions")
      .select("amount")
      .eq("referrer_id", user.id);

    const totalEarned = (commissions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://subsdealer.com";
    const referralLink = `${siteUrl}/?ref=${referralCode}`;

    return NextResponse.json({
      success: true,
      referral_code: referralCode,
      referral_link: referralLink,
      referred_count: referredCount || 0,
      total_earned: totalEarned,
      wallet_balance: profile?.wallet_balance || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch referral stats" }, { status: 500 });
  }
}
