/**
 * FazerCards Automated Catalog Plan Seeder
 *
 * Fetches live offer lists for PUBG UC, Free Fire BD, Telegram Stars, and Steam Cards
 * and inserts/updates them in sub_products & sub_plans with baseline BDT pricing (৳130 / USD).
 */

const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  envText.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
}

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fazercardsMcpUrl =
  process.env.FAZERCARDS_MCP_URL ||
  "https://api.fzr.cards/mcp/mcp_f73e897370384f2d12d08b4bfa1ac0ae942cea26aeacebf8";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BDT_PER_USD = 142; // Base cost ৳132 (Binance P2P) + ৳10 profit margin = ৳142/USD

async function callFazerMcpTool(toolName, args = {}) {
  const res = await fetch(fazercardsMcpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  const json = await res.json();
  const text = json.result?.content?.[0]?.text;
  if (!text) throw new Error(`Empty response for tool ${toolName}`);
  return JSON.parse(text);
}

async function seedFazerCategory({ productSlug, productName, categoryId, type, accessType = "personal", deliveryType = "credential", category = "games" }) {
  console.log(`\n📦 Processing Category: ${categoryId} (${productName})...`);

  // 1. Ensure product exists in sub_products
  let { data: product } = await supabase
    .from("sub_products")
    .select("id, slug")
    .eq("slug", productSlug)
    .maybeSingle();

  if (!product) {
    const { data: newProd, error: prodErr } = await supabase
      .from("sub_products")
      .insert({
        name: productName,
        slug: productSlug,
        category: category,
        access_type: accessType,
        delivery_type: deliveryType,
        is_active: true,
        features: ["24/7 Instant Delivery", "Official FazerCards Supplier", "Direct Player ID / Code Delivery"],
      })
      .select()
      .single();

    if (prodErr) {
      console.error(`Failed to create product ${productSlug}:`, prodErr);
      return;
    }
    product = newProd;
    console.log(`✅ Created Product: ${productName} (${product.id})`);
  } else {
    // Update category for existing product if null
    await supabase.from("sub_products").update({ category }).eq("id", product.id);
    console.log(`ℹ️ Existing Product Found & Category Updated (${category}): ${productName}`);
  }

  // 2. Fetch live offers from FazerCards
  try {
    const offersData = await callFazerMcpTool("get_offers", { type, category_id: categoryId });
    const offers = offersData.offers || [];
    console.log(`  Found ${offers.length} offers for ${categoryId}`);

    let sortOrder = 1;
    for (const offer of offers) {
      const offerId = offer.offer_id || offer.card_id;
      const title = offer.name;
      const priceUsd = Number(offer.price_usd || 0);

      if (priceUsd <= 0) continue;

      // Price BDT = USD * 130, rounded to nearest ৳5
      const priceBdt = Math.ceil((priceUsd * BDT_PER_USD) / 5) * 5;
      const compareAtBdt = Math.ceil(priceBdt * 1.15);

      // Check if plan already exists for this offer by offer_id or name
      let existingPlan = null;
      if (offerId) {
        const { data } = await supabase
          .from("sub_plans")
          .select("id")
          .eq("product_id", product.id)
          .eq("fazercards_offer_id", offerId)
          .maybeSingle();
        existingPlan = data;
      }
      if (!existingPlan) {
        const { data } = await supabase
          .from("sub_plans")
          .select("id")
          .eq("product_id", product.id)
          .eq("name", title)
          .maybeSingle();
        existingPlan = data;
      }

      if (existingPlan) {
        const { error: updateErr } = await supabase
          .from("sub_plans")
          .update({
            name: title,
            price_bdt: priceBdt,
            compare_at_bdt: compareAtBdt,
            fazercards_category_id: categoryId,
            fazercards_type: type,
            is_active: true,
            sort_order: sortOrder++,
          })
          .eq("id", existingPlan.id);

        if (updateErr) {
          await supabase
            .from("sub_plans")
            .update({
              name: title,
              price_bdt: priceBdt,
              compare_at_bdt: compareAtBdt,
              is_active: true,
              sort_order: sortOrder,
            })
            .eq("id", existingPlan.id);
        }
        console.log(`  🔄 Updated Plan: ${title} -> ৳${priceBdt}`);
      } else {
        const { error: insErr } = await supabase.from("sub_plans").insert({
          product_id: product.id,
          name: title,
          duration_days: 30,
          price_bdt: priceBdt,
          compare_at_bdt: compareAtBdt,
          fazercards_category_id: categoryId,
          fazercards_offer_id: offerId,
          fazercards_type: type,
          is_active: true,
          sort_order: sortOrder++,
        });

        if (insErr) {
          // Fallback if fazercards columns do not exist in DB yet
          const { error: fbErr } = await supabase.from("sub_plans").insert({
            product_id: product.id,
            name: title,
            duration_days: 30,
            price_bdt: priceBdt,
            compare_at_bdt: compareAtBdt,
            is_active: true,
            sort_order: sortOrder,
          });
          if (fbErr) console.error(`Failed fallback insert for ${title}:`, fbErr.message);
        }
        console.log(`  ✨ Created Plan: ${title} -> ৳${priceBdt}`);
      }
    }
  } catch (err) {
    console.error(`Error fetching offers for ${categoryId}:`, err.message);
  }
}

async function runSeeder() {
  console.log("🚀 Starting Bulk FazerCards Product & Plan Auto-Seeder...");

  const categoriesToSeed = [
    { productSlug: "pubg-mobile-uc", productName: "PUBG Mobile UC", categoryId: "pubg_mobile_auto", type: "topups", category: "games" },
    { productSlug: "free-fire", productName: "Free Fire (BD Server)", categoryId: "free_fire_bd", type: "topups", category: "games" },
    { productSlug: "genshin-impact", productName: "Genshin Impact (Global)", categoryId: "genshin_impact_global", type: "topups", category: "games" },
    { productSlug: "mobile-legends", productName: "Mobile Legends: Bang Bang", categoryId: "mobile_legends", type: "topups", category: "games" },
    { productSlug: "valorant", productName: "Valorant Points (Singapore)", categoryId: "valorant_sg", type: "topups", category: "games" },
    { productSlug: "valorant-my", productName: "Valorant Points (Malaysia)", categoryId: "valorant_my", type: "topups", category: "games" },
    { productSlug: "telegram-stars", productName: "Telegram Stars", categoryId: "telegram_stars", type: "gift_cards", category: "game_keys" },
    { productSlug: "telegram-premium", productName: "Telegram Premium", categoryId: "telegram_premium", type: "gift_cards", category: "game_keys" },
    { productSlug: "steam-wallet-global", productName: "Steam Wallet (Global)", categoryId: "steam_wallet_global", type: "gift_cards", category: "game_keys" },
    { productSlug: "steam-wallet-us", productName: "Steam Wallet (US)", categoryId: "steam_wallet_us", type: "gift_cards", category: "game_keys" },
    { productSlug: "steam-wallet-tr", productName: "Steam Wallet (Turkey TL)", categoryId: "steam_wallet_tr", type: "gift_cards", category: "game_keys" },
    { productSlug: "roblox-global", productName: "Roblox Card (Global)", categoryId: "roblox_global", type: "gift_cards", category: "games" },
    { productSlug: "roblox-robux-us", productName: "Roblox Robux (US)", categoryId: "roblox_robux_us", type: "gift_cards", category: "games" },
    { productSlug: "google-play-us", productName: "Google Play Card (US)", categoryId: "google_play_us", type: "gift_cards", category: "game_keys" },
    { productSlug: "google-play-tr", productName: "Google Play Card (Turkey)", categoryId: "google_play_tr", type: "gift_cards", category: "game_keys" },
    { productSlug: "delta-force", productName: "Delta Force Coins (Steam)", categoryId: "delta_force_steam_global", type: "gift_cards", category: "games" },
    { productSlug: "playstation-us", productName: "PlayStation Card (US)", categoryId: "playstation_us", type: "gift_cards", category: "game_keys" },
    { productSlug: "nintendo-us", productName: "Nintendo Switch eShop (US)", categoryId: "nintendo_switch_us", type: "gift_cards", category: "game_keys" },
    { productSlug: "tinder", productName: "Tinder Plus & Gold Voucher", categoryId: "tinder_in", type: "gift_cards", category: "subscriptions" },
    { productSlug: "imo-diamonds", productName: "IMO Diamonds Direct Top-Up", categoryId: "imo", type: "topups", category: "games" },
    { productSlug: "imo-gift-card", productName: "IMO Gift Card (USD)", categoryId: "imo", type: "gift_cards", category: "game_keys" },
  ];

  for (const cat of categoriesToSeed) {
    await seedFazerCategory(cat);
  }

  console.log("\n🎉 Bulk seeding completed successfully!");
}

runSeeder().catch(console.error);
