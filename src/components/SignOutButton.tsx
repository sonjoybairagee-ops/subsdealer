"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    // refresh() so the Server Components re-read the (now empty) session
    // before the push lands, otherwise the header still shows the old state.
    router.refresh();
    router.push("/");
  }

  return (
    <button type="button" className="btn-secondary" disabled={busy} onClick={signOut}>
      {busy ? "…" : "Sign out"}
    </button>
  );
}
