/**
 * FazerCards Reseller API Client (MCP Protocol)
 *
 * Connects to FazerCards Reseller Panel via Model Context Protocol (MCP) HTTP Endpoint.
 */

const FAZERCARDS_MCP_URL =
  process.env.FAZERCARDS_MCP_URL ||
  "https://api.fzr.cards/mcp/mcp_f73e897370384f2d12d08b4bfa1ac0ae942cea26aeacebf8";

export interface FazerAccount {
  login: string;
  email: string;
  plan: string;
  planExpiresAt: string;
  subscriptionActive: boolean;
  summary: {
    totalSpent: string;
    totalOrders: number;
  };
}

export interface FazerCatalogItem {
  type: "gift_cards" | "game_keys" | "topups";
  category_id: string;
  name: string;
  variant?: string;
  platform?: string;
}

export interface FazerOffer {
  id: string;
  name: string;
  price_usd: number;
  in_stock: boolean;
  stock_count?: number;
  fields?: Array<{ key: string; label: string; required: boolean }>;
}

async function callFazerMcpTool<T = any>(toolName: string, args: Record<string, any> = {}): Promise<T> {
  const response = await fetch(FAZERCARDS_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FazerCards API Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`FazerCards MCP Error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  const textContent = json.result?.content?.[0]?.text;
  if (!textContent) {
    throw new Error("Empty response from FazerCards MCP tool");
  }

  try {
    return JSON.parse(textContent) as T;
  } catch (err) {
    throw new Error(`Failed to parse FazerCards response: ${textContent}`);
  }
}

/**
 * Get FazerCards Reseller Account Info
 */
export async function getFazerAccount(): Promise<FazerAccount> {
  return callFazerMcpTool<FazerAccount>("get_account", {});
}

/**
 * Get FazerCards Balance (USD)
 */
export async function getFazerBalance(): Promise<{ balance_usd: number; currency: string }> {
  return callFazerMcpTool("get_balance", {});
}

/**
 * Search FazerCards Catalog
 */
export async function searchFazerCatalog(
  query: string,
  type?: "gift_cards" | "game_keys" | "topups",
  region?: string
): Promise<{ results: FazerCatalogItem[]; total_matched: number }> {
  return callFazerMcpTool("search_catalog", { query, type, region });
}

/**
 * Get Denominations / Offers for a Category
 */
export async function getFazerOffers(
  type: "gift_cards" | "game_keys" | "topups",
  categoryId: string
): Promise<any> {
  return callFazerMcpTool("get_offers", { type, category_id: categoryId });
}

/**
 * Validate Player ID / Fields before placing top-up order
 */
export async function validateFazerTopupId(
  categoryId: string,
  fields: Record<string, string>
): Promise<{ valid: boolean; name?: string; message?: string }> {
  return callFazerMcpTool("validate_topup_id", { category_id: categoryId, fields });
}

/**
 * Place Order on FazerCards (SPENDS REAL RESELLER BALANCE)
 */
export async function createFazerOrder(params: {
  type: "gift_cards" | "game_keys" | "topups";
  categoryId: string;
  offerId: string;
  quantity?: number;
  fields?: Record<string, string>;
  idempotencyKey: string;
}): Promise<{
  order_id: string;
  status: "completed" | "processing" | "failed";
  delivered_codes?: string[];
  total_price_usd?: number;
}> {
  return callFazerMcpTool("create_order", {
    type: params.type,
    category_id: params.categoryId,
    offer_id: params.offerId,
    quantity: params.quantity || 1,
    fields: params.fields,
    idempotency_key: params.idempotencyKey,
  });
}

/**
 * Fetch status of an order by public order_id (e.g. ord-123)
 */
export async function getFazerOrder(orderId: string): Promise<any> {
  return callFazerMcpTool("get_order", { order_id: orderId });
}
