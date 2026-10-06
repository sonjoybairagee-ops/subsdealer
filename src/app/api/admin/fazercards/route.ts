import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getFazerAccount, getFazerBalance, searchFazerCatalog, getFazerOffers } from "@/lib/fazercards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "account";
  const query = searchParams.get("query") || "";
  const type = searchParams.get("type") as any;
  const categoryId = searchParams.get("categoryId") || "";

  try {
    if (action === "account") {
      const account = await getFazerAccount();
      const balance = await getFazerBalance();
      return NextResponse.json({ account, balance });
    }

    if (action === "search") {
      if (!query) {
        return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
      }
      const results = await searchFazerCatalog(query, type);
      return NextResponse.json(results);
    }

    if (action === "offers") {
      if (!categoryId || !type) {
        return NextResponse.json({ error: "categoryId and type parameters required" }, { status: 400 });
      }
      const offers = await getFazerOffers(type, categoryId);
      return NextResponse.json({ offers });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "FazerCards API request failed" }, { status: 500 });
  }
}
