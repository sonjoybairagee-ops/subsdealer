"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/api-client";
import type { SubProduct, SubTeam, SubTeamUsage } from "@/lib/subscriptions";

type TeamRow = SubTeam & { usage: SubTeamUsage | null; credentialCount: number };

export function SubTeamsManager({
  products,
  teams,
}: {
  products: Pick<SubProduct, "id" | "name" | "access_type">[];
  teams: TeamRow[];
}) {
  const router = useRouter();
  const [productFilter, setProductFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(
    () =>
      teams.filter(
        (t) =>
          (productFilter === "all" || t.product_id === productFilter) &&
          (showInactive || t.is_active),
      ),
    [teams, productFilter, showInactive],
  );

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "Unknown product";

  const totals = visible.reduce(
    (acc, t) => {
      acc.capacity += t.capacity;
      acc.members += t.usage?.active_members ?? 0;
      return acc;
    },
    { capacity: 0, members: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Teams</h2>
          <p className="muted mt-1 text-sm">
            {visible.length} team{visible.length === 1 ? "" : "s"} · {totals.members} of{" "}
            {totals.capacity} seats filled
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto"
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
          <button className="btn-secondary" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? "Hide inactive" : "Show inactive"}
          </button>
          <button
            className="btn-primary"
            disabled={products.length === 0}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Close" : "＋ New team"}
          </button>
        </div>
      </div>

      {products.length === 0 && (
        <div className="card p-6">
          <p className="font-bold text-white">Add a product first</p>
          <p className="muted mt-2 text-sm">
            A team always belongs to one product, so create the product before the teams
            that hold its accounts.
          </p>
        </div>
      )}

      {creating && (
        <TeamForm
          products={products}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {visible.length === 0 && products.length > 0 && !creating && (
        <div className="card p-8 text-center">
          <p className="font-bold text-white">No teams here yet</p>
          <p className="muted mt-2 text-sm">
            Create one team per shared account group, then attach credentials to it.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            productName={productName(team.product_id)}
            products={products}
            editing={editingId === team.id}
            onEdit={() => setEditingId(editingId === team.id ? null : team.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TeamCard({
  team,
  productName,
  products,
  editing,
  onEdit,
}: {
  team: TeamRow;
  productName: string;
  products: Pick<SubProduct, "id" | "name" | "access_type">[];
  editing: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const members = team.usage?.active_members ?? 0;
  const pct = team.capacity > 0 ? Math.min(100, Math.round((members / team.capacity) * 100)) : 0;
  const full = members >= team.capacity;
  const over = members > team.capacity;

  async function toggleActive() {
    setBusy(true);
    setMsg(null);
    const res = await callApi("/api/admin/sub/teams", "PATCH", {
      id: team.id,
      isActive: !team.is_active,
    });
    setBusy(false);
    if (!res.ok) setMsg(res.error);
    else router.refresh();
  }

  async function deactivate() {
    setBusy(true);
    setMsg(null);
    const res = await callApi("/api/admin/sub/teams", "DELETE", { id: team.id });
    setBusy(false);
    if (!res.ok) setMsg(res.error);
    else router.refresh();
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-white">{team.name}</h3>
            {!team.is_active && <span className="badge badge-neutral">Inactive</span>}
            {over && <span className="badge badge-danger">Over capacity</span>}
            {!over && full && <span className="badge badge-warn">Full</span>}
          </div>
          <p className="muted mt-1 text-xs">{productName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">
            {members}
            <span className="muted text-base font-bold">/{team.capacity}</span>
          </p>
          <p className="muted text-xs">members</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]">
        <div
          className={`h-full rounded-full transition-all ${
            over ? "bg-[#ff6b6b]" : full ? "bg-[#ffb347]" : "bg-[#e5243b]"
          }`}
          style={{ width: `${Math.max(pct, members > 0 ? 4 : 0)}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="muted">
          Credentials: <b className="text-gray-300">{team.credentialCount}</b>
        </span>
        <span className="muted">
          Free seats: <b className="text-gray-300">{Math.max(0, team.capacity - members)}</b>
        </span>
        {team.login_url && (
          <a
            href={team.login_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#e5243b] underline"
          >
            Portal link
          </a>
        )}
      </div>

      {team.notes && <p className="muted mt-3 text-sm leading-6">{team.notes}</p>}

      {msg && <p className="mt-3 text-sm text-[#ff8c8c]">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.06] pt-4">
        <button className="btn-secondary" onClick={onEdit}>
          {editing ? "Cancel" : "Edit"}
        </button>
        <button className="btn-secondary" disabled={busy} onClick={toggleActive}>
          {team.is_active ? "Mark inactive" : "Reactivate"}
        </button>
        {team.is_active && (
          <button className="btn-danger" disabled={busy} onClick={deactivate}>
            Retire team
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 border-t border-white/[.06] pt-4">
          <TeamForm
            products={products}
            team={team}
            onDone={() => {
              onEdit();
              router.refresh();
            }}
          />
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

function TeamForm({
  products,
  team,
  onDone,
}: {
  products: Pick<SubProduct, "id" | "name" | "access_type">[];
  team?: SubTeam;
  onDone: () => void;
}) {
  const isEdit = Boolean(team);
  const [form, setForm] = useState({
    productId: team?.product_id ?? products[0]?.id ?? "",
    name: team?.name ?? "",
    capacity: String(team?.capacity ?? 5),
    loginUrl: team?.login_url ?? "",
    notes: team?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      capacity: Number(form.capacity),
      loginUrl: form.loginUrl.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (isEdit) payload.id = team!.id;
    else payload.productId = form.productId;

    const res = await callApi("/api/admin/sub/teams", isEdit ? "PATCH" : "POST", payload);
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else onDone();
  }

  return (
    <form onSubmit={submit} className={isEdit ? "" : "card p-6"}>
      <div className="grid gap-5 md:grid-cols-2">
        {!isEdit && (
          <label>
            <span className="label">Product</span>
            <select
              className="input"
              required
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="label">Team name</span>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Canva Team #01"
          />
        </label>
        <label>
          <span className="label">Capacity (seats)</span>
          <input
            className="input"
            type="number"
            min={1}
            max={500}
            required
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <span className="muted mt-1 block text-xs">
            Keep this at or below the real account limit. Smaller teams mean fewer customers
            affected if the account gets flagged.
          </span>
        </label>
        <label>
          <span className="label">Team login URL</span>
          <input
            className="input"
            type="url"
            value={form.loginUrl}
            onChange={(e) => setForm({ ...form, loginUrl: e.target.value })}
            placeholder="https://account.adobe.com"
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Admin notes (never shown to customers)</span>
          <textarea
            className="input min-h-20"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Billed on the 5th. Recovery email: ..."
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {err && <p className="mr-auto text-sm text-[#ff8c8c]">{err}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create team"}
        </button>
      </div>
    </form>
  );
}
