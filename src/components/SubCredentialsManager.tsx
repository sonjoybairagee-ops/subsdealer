"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { callApi, copyToClipboard } from "@/lib/api-client";
import { timeAgo, type SubCredentialUsage, type SubProduct, type SubTeam } from "@/lib/subscriptions";

/** How long a revealed password stays on screen before it hides itself. */
const REVEAL_TTL_MS = 60_000;

type CredentialRow = SubCredentialUsage & { login_url: string | null; extra_notes: string | null };

export function SubCredentialsManager({
  products,
  teams,
  credentials,
  encryptionReady,
}: {
  products: Pick<SubProduct, "id" | "name" | "access_type" | "delivery_type">[];
  teams: Pick<SubTeam, "id" | "name" | "product_id" | "capacity">[];
  credentials: CredentialRow[];
  encryptionReady: boolean;
}) {
  const router = useRouter();
  const [productFilter, setProductFilter] = useState("all");
  const [onlyFree, setOnlyFree] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      credentials.filter(
        (c) =>
          (productFilter === "all" || c.product_id === productFilter) &&
          (!onlyFree || c.free_slots > 0),
      ),
    [credentials, productFilter, onlyFree],
  );

  const stats = credentials.reduce(
    (acc, c) => {
      if (c.status === "active") {
        acc.seats += c.max_users;
        acc.used += c.active_users;
        if (c.free_slots > 0) acc.withRoom++;
      }
      if (c.status === "revoked") acc.revoked++;
      return acc;
    },
    { seats: 0, used: 0, withRoom: 0, revoked: 0 },
  );

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "Unknown";
  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? "—" : "—");

  return (
    <div className="space-y-6">
      {!encryptionReady && (
        <div className="card border border-[#ff6b6b]/40 p-5">
          <p className="font-bold text-[#ff8c8c]">CREDENTIAL_ENC_KEY is not configured</p>
          <p className="muted mt-2 text-sm">
            Credentials cannot be stored or read until a valid 64-character hex key is set on
            the server. Generate one with <code className="font-mono">openssl rand -hex 32</code>{" "}
            and add it to your environment variables, then redeploy.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Seats in pool" value={stats.seats} />
        <Stat label="Seats used" value={stats.used} />
        <Stat label="Credentials with room" value={stats.withRoom} tone={stats.withRoom === 0 ? "warn" : "green"} />
        <Stat label="Revoked" value={stats.revoked} tone={stats.revoked > 0 ? "warn" : "neutral"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <button className="btn-secondary" onClick={() => setOnlyFree((v) => !v)}>
            {onlyFree ? "Showing: has room" : "Show all"}
          </button>
        </div>
        <button
          className="btn-primary"
          disabled={products.length === 0 || !encryptionReady}
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Close" : "＋ New credential"}
        </button>
      </div>

      {creating && (
        <CredentialForm
          products={products}
          teams={teams}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {visible.length === 0 && !creating && (
        <div className="card p-8 text-center">
          <p className="font-bold text-white">No credentials here</p>
          <p className="muted mt-2 text-sm">
            Add the logins you resell. Keep a spare or two per product — when an account gets
            flagged you can move customers across in seconds.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((cred) => (
          <CredentialCard
            key={cred.credential_id}
            cred={cred}
            productName={productName(cred.product_id)}
            teamLabel={teamName(cred.team_id)}
            products={products}
            teams={teams}
            editing={editingId === cred.credential_id}
            onEdit={() =>
              setEditingId(editingId === cred.credential_id ? null : cred.credential_id)
            }
          />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "green" | "warn" | "neutral";
}) {
  const color =
    tone === "green" ? "text-[#ff8f9b]" : tone === "warn" ? "text-[#ffcf8c]" : "text-white";
  return (
    <div className="card p-4">
      <p className="muted text-xs uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CredentialCard({
  cred,
  productName,
  teamLabel,
  products,
  teams,
  editing,
  onEdit,
}: {
  cred: CredentialRow;
  productName: string;
  teamLabel: string;
  products: Pick<SubProduct, "id" | "name" | "access_type" | "delivery_type">[];
  teams: Pick<SubTeam, "id" | "name" | "product_id" | "capacity">[];
  editing: boolean;
  onEdit: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // A password left on screen is a password someone walks past and reads.
  // Clear it from React state on a timer and on unmount.
  useEffect(() => {
    if (revealed === null) return;
    setSecondsLeft(Math.round(REVEAL_TTL_MS / 1000));
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRevealed(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [revealed]);

  useEffect(() => () => setRevealed(null), []);

  async function reveal() {
    setBusy(true);
    setMsg(null);
    const res = await callApi<{ password: string }>("/api/admin/sub/reveal-credential", "POST", {
      credentialId: cred.credential_id,
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      setMsg(res.error);
      return;
    }
    setRevealed(res.data.password);
  }

  async function copy(label: string, value: string) {
    const ok = await copyToClipboard(value);
    setCopied(ok ? label : null);
    setTimeout(() => setCopied(null), 1800);
  }

  const full = cred.free_slots <= 0;

  return (
    <article
      className={`card p-5 ${cred.status === "revoked" ? "opacity-60" : ""} ${
        cred.status === "active" && full ? "border border-[#ffb347]/25" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-mono text-base font-bold text-white">
              {cred.login_email}
            </h3>
            <span
              className={`badge ${
                cred.status === "active"
                  ? "badge-green"
                  : cred.status === "rotating"
                    ? "badge-warn"
                    : "badge-danger"
              }`}
            >
              {cred.status}
            </span>
            {cred.status === "active" && full && <span className="badge badge-warn">Full</span>}
          </div>
          <p className="muted mt-1 text-xs">
            {productName} · Team {teamLabel}
            {cred.label ? ` · ${cred.label}` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xl font-black text-white">
            {cred.active_users}
            <span className="muted text-sm font-bold">/{cred.max_users}</span>
          </p>
          <p className="muted text-xs">customers</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Login email"
          value={cred.login_email}
          mono
          onCopy={() => copy("email", cred.login_email)}
          copied={copied === "email"}
        />
        <div>
          <p className="label">Password</p>
          <div className="flex items-center gap-2">
            <code className="input flex-1 truncate font-mono">
              {revealed ?? "••••••••••••"}
            </code>
            {revealed ? (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copy("password", revealed)}
                >
                  {copied === "password" ? "✓" : "Copy"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setRevealed(null)}>
                  Hide
                </button>
              </>
            ) : (
              <button type="button" className="btn-secondary" disabled={busy} onClick={reveal}>
                {busy ? "…" : "Show"}
              </button>
            )}
          </div>
          {revealed && (
            <p className="muted mt-1 text-xs">
              Hides in {secondsLeft}s · this view was logged to the audit trail
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="muted">
          Updated <b className="text-gray-300">{timeAgo(cred.updated_at)}</b>
        </span>
        {cred.rotated_at && (
          <span className="muted">
            Password rotated <b className="text-gray-300">{timeAgo(cred.rotated_at)}</b>
          </span>
        )}
        {cred.login_url && (
          <a
            href={cred.login_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#e5243b] underline"
          >
            Portal link
          </a>
        )}
      </div>

      {cred.extra_notes && <p className="muted mt-3 text-sm leading-6">{cred.extra_notes}</p>}

      {msg && <p className="mt-3 text-sm text-[#ffcf8c]">{msg}</p>}

      <div className="mt-4 border-t border-white/[.06] pt-4">
        <button className="btn-secondary" onClick={onEdit}>
          {editing ? "Cancel" : "Edit / rotate password"}
        </button>
      </div>

      {editing && (
        <div className="mt-4 border-t border-white/[.06] pt-4">
          <CredentialForm
            products={products}
            teams={teams}
            credential={cred}
            onDone={() => {
              setRevealed(null);
              onEdit();
            }}
          />
        </div>
      )}
    </article>
  );
}

function Field({
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-2">
        <code className={`input flex-1 truncate ${mono ? "font-mono" : ""}`}>{value}</code>
        <button type="button" className="btn-secondary" onClick={onCopy}>
          {copied ? "✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CredentialForm({
  products,
  teams,
  credential,
  onDone,
}: {
  products: Pick<SubProduct, "id" | "name" | "access_type" | "delivery_type">[];
  teams: Pick<SubTeam, "id" | "name" | "product_id" | "capacity">[];
  credential?: CredentialRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(credential);
  const [form, setForm] = useState({
    productId: credential?.product_id ?? products[0]?.id ?? "",
    teamId: credential?.team_id ?? "",
    label: credential?.label ?? "",
    loginEmail: credential?.login_email ?? "",
    password: "",
    loginUrl: credential?.login_url ?? "",
    extraNotes: credential?.extra_notes ?? "",
    maxUsers: String(credential?.max_users ?? 1),
    status: credential?.status ?? "active",
    notifyUsers: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const teamOptions = teams.filter((t) => t.product_id === form.productId);

  // An invite product's "credential" is the panel YOU sign into to send
  // invites — it is never handed to a customer. The labels have to say so,
  // or this screen reads as though the password gets passed on.
  const selectedProduct = products.find((p) => p.id === form.productId);
  const isInvite =
    (credential
      ? products.find((p) => p.id === credential.product_id)?.delivery_type
      : selectedProduct?.delivery_type) === "invite";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);

    if (!isEdit && !isInvite && !form.password) {
      setBusy(false);
      setErr("A password is required for a login-delivered product.");
      return;
    }

    const payload: Record<string, unknown> = {
      teamId: form.teamId || null,
      label: form.label.trim() || null,
      loginUrl: form.loginUrl.trim() || null,
      extraNotes: form.extraNotes.trim() || null,
      maxUsers: Number(form.maxUsers),
    };

    if (isEdit) {
      payload.id = credential!.credential_id;
      payload.status = form.status;
      payload.notifyUsers = form.notifyUsers;
      if (form.loginEmail.trim() && form.loginEmail.trim() !== credential!.login_email) {
        payload.loginEmail = form.loginEmail.trim();
      }
      if (form.password) payload.password = form.password;
    } else {
      payload.productId = form.productId;
      payload.loginEmail = form.loginEmail.trim();
      payload.password = form.password;
    }

    const res = await callApi<{ note?: string }>(
      "/api/admin/sub/credentials",
      isEdit ? "PATCH" : "POST",
      payload,
    );
    setBusy(false);

    if (!res.ok) {
      setErr(res.error);
      return;
    }

    // Never leave the plaintext sitting in component state after a save.
    setForm((f) => ({ ...f, password: "" }));
    setNote(res.data?.note ?? "Saved.");
    router.refresh();
    if (!isEdit) onDone();
  }

  return (
    <form onSubmit={submit} className={isEdit ? "" : "card p-6"}>
      {isInvite && (
        <div className="mb-5 rounded-xl border border-[#e5243b]/25 bg-[#e5243b]/[.06] p-4">
          <p className="font-bold text-white">This product is delivered by invite</p>
          <p className="muted mt-1.5 text-sm leading-6">
            No password needed. This row just records{" "}
            <b className="text-white">which panel or class</b> a customer was placed into,
            so seats can be counted and the next customer routed. You create the class and
            send the invite yourself in {" "}
            {products.find((p) => p.id === form.productId)?.name ?? "the provider"}, then
            mark it as sent under Subscriptions.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {!isEdit && (
          <label>
            <span className="label">Product</span>
            <select
              className="input"
              required
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value, teamId: "" })}
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
          <span className="label">Team</span>
          <select
            className="input"
            value={form.teamId}
            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
          >
            <option value="">No team</option>
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.capacity} seats)
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label">
            {isInvite ? "Which account this class lives in" : "Login email"}
          </span>
          <input
            className="input font-mono"
            type="email"
            required={!isEdit}
            value={form.loginEmail}
            onChange={(e) => setForm({ ...form, loginEmail: e.target.value })}
            placeholder={isInvite ? "your-canva-account@gmail.com" : "team03@yourdomain.com"}
          />
          {isInvite && (
            <span className="muted mt-1 block text-xs">
              Your own account email, used here only as a label — so you can tell your
              panels apart once there is more than one. Never shown to a customer.
            </span>
          )}
        </label>

        {/* Only a login-delivered product has a password worth keeping. */}
        {!isInvite && (
          <label>
            <span className="label">
              {isEdit ? "New password (leave blank to keep current)" : "Password"}
            </span>
            <input
              className="input font-mono"
              type="password"
              autoComplete="new-password"
              required={!isEdit}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? "••••••••" : ""}
            />
            <span className="muted mt-1 block text-xs">
              Encrypted before it is stored. Nobody — including a database backup — can read
              it without the server key.
            </span>
          </label>
        )}

        <label>
          <span className="label">
            {isInvite ? "Seats on this panel" : "Max customers on this login"}
          </span>
          <input
            className="input"
            type="number"
            min={1}
            max={500}
            required
            value={form.maxUsers}
            onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
          />
        </label>

        <label>
          <span className="label">{isInvite ? "Panel login URL" : "Login URL"}</span>
          <input
            className="input"
            type="url"
            value={form.loginUrl}
            onChange={(e) => setForm({ ...form, loginUrl: e.target.value })}
            placeholder="https://account.adobe.com"
          />
        </label>

        <label>
          <span className="label">Internal label</span>
          <input
            className="input"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Adobe · card ending 4421"
          />
        </label>

        {isEdit && (
          <label>
            <span className="label">Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="active">Active</option>
              <option value="rotating">Rotating (do not assign)</option>
              <option value="revoked">Revoked (unassign everyone)</option>
            </select>
            {form.status === "revoked" && credential && credential.active_users > 0 && (
              <span className="mt-1 block text-xs text-[#ffcf8c]">
                {credential.active_users} customer(s) will be moved back to the
                pending-credential queue.
              </span>
            )}
          </label>
        )}

        <label className="md:col-span-2">
          <span className="label">Notes shown to the customer</span>
          <textarea
            className="input min-h-20"
            value={form.extraNotes}
            onChange={(e) => setForm({ ...form, extraNotes: e.target.value })}
            placeholder="Use profile 3 only. Do not change the password or the plan."
          />
        </label>

        {isEdit && (
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.notifyUsers}
              onChange={(e) => setForm({ ...form, notifyUsers: e.target.checked })}
            />
            <span className="text-sm text-gray-300">
              Email affected customers when the password changes
              <span className="muted block text-xs">
                Strongly recommended — otherwise they just see &ldquo;login failed&rdquo; and
                open a ticket.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {err && <p className="mr-auto text-sm text-[#ff8c8c]">{err}</p>}
        {note && <p className="mr-auto text-sm text-[#ff8f9b]">{note}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save credential" : "Add credential"}
        </button>
      </div>
    </form>
  );
}
