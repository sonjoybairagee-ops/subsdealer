/**
 * Tiny fetch wrapper for the admin client components.
 *
 * Centralised so every form reports server errors the same way instead of
 * each one inventing its own "something went wrong".
 */

export interface ApiResult<T = any> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export async function callApi<T = any>(
  url: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // A 500 from the edge can come back as HTML rather than JSON.
    }

    if (!res.ok) {
      return {
        ok: false,
        data: null,
        error: json?.error ?? `Request failed (${res.status} ${res.statusText})`,
      };
    }
    return { ok: true, data: json as T, error: null };
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message ?? "Network error" };
  }
}

/** Copy helper that degrades gracefully when the clipboard API is blocked. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
