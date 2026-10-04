"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { callApi, copyToClipboard } from "@/lib/api-client";
import {
  DURATION_PRESETS,
  daysRemaining,
  formatDhakaDate,
  subscriptionStatusMeta,
  timeAgo,
  type SubscriptionStatus,
} from "@/lib/subscriptions";
import type { CredentialOption } from "@/components/SubOrderQueue";

export interface AdminSubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string;
  product_id: string;
  productName: string;
  deliveryType: string;
  invite_email: string | null;
  invited_at: string | null;
  planName: string;
  credential_id: string | null;
  credentialEmail: string | null;
  team_id: string | null;
  teamName: string | null;
  customerEmail: string | null;
  customerName: string | null;
  revoked_reason: string | null;
}

export interface TeamOption {
  id: string;
  product_id: string;
  name: string;
  capacity: number;
  active_members: number;
}

type Filter =
  | "all"
  | SubscriptionStatus
  | "expiring_7"
  | "expiring_3"
  | "needs_credential"
  | "needs_invite";

/** An invite product that is paid for but whose invite has not gone out yet. */
function needsInvite(s: AdminSubscriptionRow): boolean {
  return (
    s.deliveryType === "invite" &&
    (s.status === "active" || s.status === "pending_credential") &&
    !s.invited_at
  );
}

export function SubscriptionsTable({
  subscriptions,
  credentials,
  teams,
  products,
}: {
  subscriptions: AdminSubscriptionRow[];
  credentials: CredentialOption[];
  teams: TeamOption[];
  products: { id: string; name: string }[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [productFilter, setProductFilter] = useState("all");
  const [q, setQ] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: subscriptions.length,
      active: subscriptions.filter((s) => s.status === "active").length,
      needs_credential: subscriptions.filter((s) => s.status === "pending_credential").length,
      needs_invite: subscriptions.filter(needsInvite).length,
      expiring_3: subscriptions.filter(
        (s) => s.status === "active" && daysRemaining(s.expiry_date, now) <= 3,
      ).length,
      expiring_7: subscriptions.filter(
        (s) => s.status === "active" && daysRemaining(s.expiry_date, now) <= 7,
      ).length,
      expired: subscriptions.filter((s) => s.status === "expired").length,
      paused: subscriptions.filter((s) => s.status === "paused").length,
      revoked: subscriptions.filter((s) => s.status === "revoked").length,
    };
  }, [subscriptions]);

  const visible = useMemo(() => {
    const now = new Date();
    const needle = q.trim().toLowerCase();
    return subscriptions.filter((s) => {
      if (productFilter !== "all" && s.product_id !== productFilter) return false;
      if (needle) {
        const hay = `${s.customerEmail ?? ""} ${s.customerName ?? ""} ${s.credentialEmail ?? ""} ${s.teamName ?? ""} ${s.invite_email ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      switch (filter) {
        case "all":
          return true;
        case "expiring_3":
          return s.status === "active" && daysRemaining(s.expiry_date, now) <= 3;
        case "expiring_7":
          return s.status === "active" && daysRemaining(s.expiry_date, now) <= 7;
        case "needs_credential":
          return s.status === "pending_credential";
        case "needs_invite":
          return needsInvite(s);
        default:
          return s.status === filter;
      }
    });
  }, [subscriptions, filter, productFilter, q]);

  const FILTERS: [Filter, string, number][] = [
    ["all", "All", counts.all],
    ["needs_invite", "Send invite", counts.needs_invite],
    ["needs_credential", "Needs credential", counts.needs_credential],
    ["expiring_3", "Expiring ≤3d", counts.expiring_3],
    ["expiring_7", "Expiring ≤7d", counts.expiring_7],
    ["active", "Active", counts.active],
    ["expired", "Expired", counts.expired],
    ["paused", "Paused", counts.paused],
    ["revoked", "Revoked", counts.revoked],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? "bg-[#e5243b] text-black" : "bg-white/5 text-white hover:bg-white/10"
            } ${n === 0 && key !== "all" ? "opacity-50" : ""}`}
          >
            {label} {n > 0 ? `(${n})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input !mt-0 w-auto"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="input !mt-0 w-[280px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customer, login or team…"
        />
        <span className="muted ml-auto text-sm">
          {visible.length} of {subscriptions.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-bold text-white">Nothing matches</p>
          <p className="muted mt-2 text-sm">Try a different filter or clear the search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((sub) => (
            <SubscriptionRow
              key={sub.id}
              sub={sub}
              open={openRow === sub.id}
              onToggle={() => setOpenRow(openRow === sub.id ? null : sub.id)}
              credentials={credentials.filter((c) => c.product_id === sub.product_id)}
              teams={teams.filter((t) => t.product_id === sub.product_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SubscriptionRow({
  sub,
  open,
  onToggle,
  credentials,
  teams,
}: {
  sub: AdminSubscriptionRow;
  open: boolean;
  onToggle: () => void;
  credentials: CredentialOption[];
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [credentialId, setCredentialId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [extendDays, setExtendDays] = useState("30");
  const [reason, setReason] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [editEmail, setEditEmail] = useState("");

  const meta = subscriptionStatusMeta(sub.status);
  const left = daysRemaining(sub.expiry_date);
  const endingSoon = sub.status === "active" && left <= 7;
  const isInvite = sub.deliveryType === "invite";

  async function run(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setErr(null);
    setMsg(null);
    const res = await callApi<{ note?: string }>("/api/admin/sub/subscription-action", "POST", {
      subscriptionId: sub.id,
      ...payload,
    });
    setBusy(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg(res.data?.note ?? "Done.");
    setConfirmRevoke(false);
    setReason("");
    router.refresh();
  }

  return (
    <article className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left hover:bg-white/[.02]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-white">{sub.productName}</span>
            <span className={`badge badge-${meta.tone === "green" ? "green" : meta.tone}`}>
              {meta.label}
            </span>
            {endingSoon && <span className="badge badge-warn">{left}d left</span>}
            {isInvite ? (
              needsInvite(sub) ? (
                <span className="badge badge-warn">Send invite</span>
              ) : sub.invited_at ? (
                <span className="badge badge-green">Invited</span>
              ) : null
            ) : (
              !sub.credential_id &&
              sub.status !== "revoked" &&
              sub.status !== "expired" && <span className="badge badge-warn">No credential</span>
            )}
          </div>
          <p className="muted mt-1 truncate font-mono text-xs">
            {sub.customerEmail ?? "unknown"}
            {isInvite
              ? sub.invite_email
                ? ` → invite ${sub.invite_email}`
                : " → no invite email"
              : sub.credentialEmail
                ? ` → ${sub.credentialEmail}`
                : ""}
            {sub.teamName ? ` · ${sub.teamName}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="muted text-xs">Expires</p>
            <p className="text-sm font-bold text-white">{formatDhakaDate(sub.expiry_date)}</p>
          </div>
          <span className="text-[#e5243b]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-white/[.06] p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <Info label="Plan" value={sub.planName} />
            <Info label="Started" value={formatDhakaDate(sub.start_date)} />
            <Info label="Customer" value={sub.customerName ?? "—"} />
            <Info label="Team" value={sub.teamName ?? "—"} />
          </div>

          {sub.revoked_reason && (
            <p className="rounded-lg border border-[#ff6b6b]/25 bg-[#ff6b6b]/[.07] p-3 text-sm text-[#ff9d9d]">
              Revoked: {sub.revoked_reason}
            </p>
          )}

          {/* ---- invite delivery ---- */}
          {isInvite && sub.status !== "revoked" && sub.status !== "expired" && (
            <div className="rounded-xl border border-white/[.08] bg-white/[.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="muted text-xs uppercase tracking-wider">Invite address</p>
                  <p className="mt-1 truncate font-mono text-sm font-bold text-white">
                    {sub.invite_email ?? "— none given —"}
                  </p>
                  <p className="muted mt-1 text-xs">
                    {sub.invited_at
                      ? `Invite sent ${timeAgo(sub.invited_at)}`
                      : "Not invited yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sub.invite_email && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => copyToClipboard(sub.invite_email!)}
                    >
                      Copy
                    </button>
                  )}
                  <button
                    className={sub.invited_at ? "btn-secondary" : "btn-primary"}
                    disabled={busy !== null || !sub.invite_email}
                    onClick={() => run({ action: "mark_invited", notify: true }, "invited")}
                  >
                    {busy === "invited"
                      ? "…"
                      : sub.invited_at
                        ? "Re-sent the invite"
                        : "Mark as invited"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/[.06] pt-3">
                <label className="flex-1">
                  <span className="label">Fix a mistyped address</span>
                  <input
                    className="input font-mono"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder={sub.invite_email ?? "you@example.com"}
                  />
                </label>
                <button
                  className="btn-secondary"
                  disabled={!editEmail.trim() || busy !== null}
                  onClick={() =>
                    run(
                      { action: "update_invite_email", inviteEmail: editEmail.trim() },
                      "email",
                    )
                  }
                >
                  {busy === "email" ? "…" : "Update"}
                </button>
              </div>
              <p className="muted mt-2 text-xs">
                Changing the address clears the sent flag, so it comes back into the
                &ldquo;Send invite&rdquo; queue.
              </p>
            </div>
          )}

          {/* ---- credential / panel ----
               Invite products still need one of these: it is the panel the
               customer is invited into, and it carries the team. */}
          {sub.status !== "revoked" && sub.status !== "expired" && (
            <div className="grid gap-3 border-t border-white/[.06] pt-4 md:grid-cols-[1fr_auto] md:items-end">
              <label>
                <span className="label">
                  {isInvite
                    ? sub.credential_id
                      ? "Move to another panel"
                      : "Assign a panel"
                    : sub.credential_id
                      ? "Move to another credential"
                      : "Assign a credential"}
                </span>
                <select
                  className="input"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                >
                  <option value="">
                    {credentials.length === 0
                      ? `No ${isInvite ? "panel" : "credential"} has a free slot`
                      : "Choose…"}
                  </option>
                  {credentials.map((c) => (
                    <option key={c.credential_id} value={c.credential_id}>
                      {c.login_email} ({c.active_users}/{c.max_users})
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn-primary"
                disabled={!credentialId || busy !== null}
                onClick={() => run({ action: "assign_credential", credentialId, notify: true }, "assign")}
              >
                {busy === "assign" ? "…" : "Assign"}
              </button>
            </div>
          )}

          {/* ---- team ---- */}
          {sub.status !== "revoked" && sub.status !== "expired" && teams.length > 0 && (
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label>
                <span className="label">Transfer to team</span>
                <select
                  className="input"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.active_members >= t.capacity}>
                      {t.name} ({t.active_members}/{t.capacity})
                      {t.active_members >= t.capacity ? " — full" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn-secondary"
                disabled={!teamId || busy !== null}
                onClick={() => run({ action: "transfer_team", teamId }, "transfer")}
              >
                {busy === "transfer" ? "…" : "Transfer"}
              </button>
            </div>
          )}

          {/* ---- extend ---- */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label>
              <span className="label">Extend by</span>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      extendDays === String(p.days)
                        ? "bg-[#e5243b] text-black"
                        : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                    onClick={() => setExtendDays(String(p.days))}
                  >
                    {p.label}
                  </button>
                ))}
                <input
                  className="input !mt-0 w-24"
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                />
              </div>
            </label>
            <button
              className="btn-secondary"
              disabled={busy !== null || !Number(extendDays)}
              onClick={() => run({ action: "extend", days: Number(extendDays) }, "extend")}
            >
              {busy === "extend" ? "…" : "Extend"}
            </button>
          </div>

          {/* ---- lifecycle ---- */}
          <div className="flex flex-wrap gap-2 border-t border-white/[.06] pt-4">
            {sub.status === "active" && (
              <button
                className="btn-secondary"
                disabled={busy !== null}
                onClick={() => run({ action: "pause" }, "pause")}
              >
                Pause
              </button>
            )}
            {sub.status === "paused" && (
              <button
                className="btn-secondary"
                disabled={busy !== null}
                onClick={() => run({ action: "resume" }, "resume")}
              >
                Resume
              </button>
            )}
            {sub.status !== "revoked" && (
              <button className="btn-danger" onClick={() => setConfirmRevoke((v) => !v)}>
                {confirmRevoke ? "Cancel" : "Revoke"}
              </button>
            )}
          </div>

          {confirmRevoke && (
            <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/[.06] p-4">
              <p className="text-sm text-[#ff9d9d]">
                Revoking cuts off access immediately and frees the credential seat. The customer
                sees the reason on their dashboard.
              </p>
              <input
                className="input mt-3"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason, e.g. shared the login with others"
              />
              <button
                className="btn-danger mt-3"
                disabled={!reason.trim() || busy !== null}
                onClick={() => run({ action: "revoke", reason: reason.trim() }, "revoke")}
              >
                {busy === "revoke" ? "…" : "Confirm revoke"}
              </button>
            </div>
          )}

          {msg && <p className="text-sm text-[#ff8f9b]">{msg}</p>}
          {err && <p className="text-sm text-[#ff9d9d]">{err}</p>}
        </div>
      )}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="muted text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}
