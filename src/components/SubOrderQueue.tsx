"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callApi, copyToClipboard } from "@/lib/api-client";
import {
  formatBdt,
  formatDhakaDateTime,
  describeDuration,
  paymentMethodLabel,
} from "@/lib/subscriptions";

export interface QueueOrder {
  id: string;
  status: string;
  amount_bdt: number;
  method: string;
  txn_ref: string | null;
  sender_number: string | null;
  receipt_path: string | null;
  created_at: string;
  hold_reason: string | null;
  reject_reason: string | null;
  invite_email: string | null;
  product_id: string;
  productName: string;
  deliveryType: string;
  planName: string;
  durationDays: number;
  customerEmail: string | null;
  customerName: string | null;
}

export interface CredentialOption {
  credential_id: string;
  product_id: string;
  login_email: string;
  label: string | null;
  active_users: number;
  max_users: number;
  free_slots: number;
}

export function SubOrderQueue({
  orders,
  credentials,
}: {
  orders: QueueOrder[];
  credentials: CredentialOption[];
}) {
  if (orders.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-bold text-white">Nothing here</p>
        <p className="muted mt-2 text-sm">No orders with this status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          credentials={credentials.filter((c) => c.product_id === order.product_id)}
        />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  credentials,
}: {
  order: QueueOrder;
  credentials: CredentialOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [askReason, setAskReason] = useState<"reject" | "hold" | null>(null);
  const [credentialId, setCredentialId] = useState("");

  const reviewable = order.status === "pending" || order.status === "on_hold";
  const poolEmpty = credentials.length === 0;

  async function act(action: "approve" | "reject" | "hold") {
    if ((action === "reject" || action === "hold") && !reason.trim()) {
      setAskReason(action);
      setErr("Please give a reason — the customer sees it on their dashboard.");
      return;
    }

    setBusy(action);
    setErr(null);
    setMsg(null);

    const res = await callApi<{ note?: string }>("/api/admin/sub/approve-order", "POST", {
      orderId: order.id,
      action,
      credentialId: action === "approve" && credentialId ? credentialId : null,
      autoAssign: action === "approve" && !credentialId,
      reason: reason.trim() || undefined,
    });

    setBusy(null);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg(res.data?.note ?? "Done.");
    setAskReason(null);
    setReason("");
    router.refresh();
  }

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-white">{order.productName}</h3>
            <span className="badge badge-neutral">{order.planName}</span>
            <span className="badge badge-neutral">{describeDuration(order.durationDays)}</span>
            {order.status === "on_hold" && <span className="badge badge-warn">On hold</span>}
          </div>

          <p className="muted mt-2 text-sm">
            {order.customerName ? `${order.customerName} · ` : ""}
            <span className="font-mono">{order.customerEmail ?? "unknown"}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
            <span className="muted">
              Method: <b className="text-gray-300">{paymentMethodLabel(order.method)}</b>
            </span>
            <span className="muted">
              TxnID: <b className="font-mono text-gray-300">{order.txn_ref ?? "—"}</b>
            </span>
            {order.sender_number && (
              <span className="muted">
                From: <b className="font-mono text-gray-300">{order.sender_number}</b>
              </span>
            )}
            <span className="muted">{formatDhakaDateTime(order.created_at)}</span>
          </div>

          {order.deliveryType === "invite" && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#e5243b]/25 bg-[#e5243b]/[.06] px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff8f9b]">
                Invite to
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {order.invite_email ?? "— none given —"}
              </span>
              {order.invite_email && (
                <button
                  type="button"
                  className="text-xs font-bold text-[#e5243b] underline"
                  onClick={() => copyToClipboard(order.invite_email!)}
                >
                  copy
                </button>
              )}
            </div>
          )}

          {order.hold_reason && (
            <p className="mt-2 text-sm text-[#ffcf8c]">On hold: {order.hold_reason}</p>
          )}
          {order.reject_reason && (
            <p className="mt-2 text-sm text-[#ff9d9d]">Rejected: {order.reject_reason}</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-[#e5243b]">{formatBdt(order.amount_bdt)}</p>
          {order.receipt_path ? (
            <a
              href={`/api/admin/receipt?path=${encodeURIComponent(order.receipt_path)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-secondary mt-2 inline-block"
            >
              View receipt ↗
            </a>
          ) : (
            <p className="muted mt-2 text-xs">No receipt</p>
          )}
        </div>
      </div>

      {reviewable && (
        <div className="border-t border-white/[.06] p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label>
              <span className="label">Credential to assign</span>
              <select
                className="input"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
              >
                <option value="">
                  {poolEmpty ? "No credential has a free slot" : "Auto — pick the fullest with room"}
                </option>
                {credentials.map((c) => (
                  <option key={c.credential_id} value={c.credential_id}>
                    {c.login_email} ({c.active_users}/{c.max_users})
                    {c.label ? ` · ${c.label}` : ""}
                  </option>
                ))}
              </select>
              {poolEmpty && (
                <span className="mt-1 block text-xs text-[#ffcf8c]">
                  You can still approve — the subscription will wait in the pending-credential
                  queue until you add a login.
                </span>
              )}
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                disabled={busy !== null}
                onClick={() => act("approve")}
              >
                {busy === "approve" ? "Approving…" : "✓ Approve"}
              </button>
              <button
                className="btn-secondary"
                disabled={busy !== null}
                onClick={() => (askReason === "hold" ? act("hold") : setAskReason("hold"))}
              >
                {busy === "hold" ? "…" : "Hold"}
              </button>
              <button
                className="btn-danger"
                disabled={busy !== null}
                onClick={() => (askReason === "reject" ? act("reject") : setAskReason("reject"))}
              >
                {busy === "reject" ? "…" : "Reject"}
              </button>
            </div>
          </div>

          {askReason && (
            <div className="mt-4">
              <label>
                <span className="label">
                  Reason for {askReason === "reject" ? "rejection" : "hold"} (shown to the
                  customer)
                </span>
                <input
                  className="input"
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    askReason === "reject"
                      ? "We could not find this transaction ID in our bKash statement."
                      : "Waiting on a clearer screenshot."
                  }
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" disabled={busy !== null} onClick={() => act(askReason)}>
                  Confirm {askReason}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setAskReason(null);
                    setReason("");
                    setErr(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(msg || err) && (
        <div className="border-t border-white/[.06] px-5 py-3">
          {msg && <p className="text-sm text-[#ff8f9b]">{msg}</p>}
          {err && <p className="text-sm text-[#ff9d9d]">{err}</p>}
        </div>
      )}
    </article>
  );
}
