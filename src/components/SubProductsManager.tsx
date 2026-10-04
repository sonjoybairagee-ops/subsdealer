"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/api-client";
import {
  DURATION_PRESETS,
  PRODUCT_CATEGORIES,
  describeDuration,
  discountPercent,
  formatBdt,
  slugify,
  type SubPlan,
  type SubProduct,
} from "@/lib/subscriptions";

type ProductWithPlans = SubProduct & { sub_plans: SubPlan[] };

export function SubProductsManager({ products }: { products: ProductWithPlans[] }) {
  const router = useRouter();
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Subscription catalogue</h2>
          <p className="muted mt-1 text-sm">
            {products.length} product{products.length === 1 ? "" : "s"} ·{" "}
            {products.reduce((n, p) => n + (p.sub_plans?.length ?? 0), 0)} plans
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? "Close" : "＋ New product"}
        </button>
      </div>

      {creating && (
        <ProductForm
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {products.length === 0 && !creating && (
        <div className="card p-8 text-center">
          <p className="font-bold text-white">No subscription products yet</p>
          <p className="muted mt-2 text-sm">
            Add Adobe Creative Cloud, Canva Pro, ChatGPT Plus and so on, then give each one
            its duration plans.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            expanded={openProduct === product.id}
            onToggle={() => setOpenProduct(openProduct === product.id ? null : product.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProductCard({
  product,
  expanded,
  onToggle,
}: {
  product: ProductWithPlans;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const plans = [...(product.sub_plans ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.duration_days - b.duration_days,
  );

  async function toggleActive() {
    setBusy(true);
    const res = await callApi("/api/admin/sub/products", "PATCH", {
      id: product.id,
      isActive: !product.is_active,
    });
    setBusy(false);
    setMsg(res.error);
    if (res.ok) router.refresh();
  }

  return (
    <article className="card overflow-hidden border border-[#e5243b]/15">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#e5243b]/10 text-lg font-black text-[#e5243b]">
            {product.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              product.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-white">{product.name}</h3>
              <span className={`badge ${product.is_active ? "badge-green" : "badge-neutral"}`}>
                {product.is_active ? "Live" : "Hidden"}
              </span>
              <span className="badge badge-neutral">
                {product.access_type === "shared" ? "Shared account" : "Personal account"}
              </span>
              <span className="badge badge-neutral">
                {product.delivery_type === "invite" ? "Invite delivery" : "Credential delivery"}
              </span>
            </div>
            <p className="muted mt-1 truncate font-mono text-xs">
              /{product.slug}
              {product.category ? ` · ${product.category}` : ""}
            </p>
            {product.tagline && <p className="muted mt-2 text-sm">{product.tagline}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button className="btn-secondary" disabled={busy} onClick={toggleActive}>
            {product.is_active ? "Hide" : "Publish"}
          </button>
          <button className="btn-secondary" onClick={onToggle}>
            {plans.length} plan{plans.length === 1 ? "" : "s"} {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {msg && <p className="px-5 pb-4 text-sm text-[#ff8c8c]">{msg}</p>}

      {plans.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/[.06] px-5 py-3">
          {plans.map((plan) => {
            const off = discountPercent(Number(plan.price_bdt), plan.compare_at_bdt ? Number(plan.compare_at_bdt) : null);
            return (
              <span
                key={plan.id}
                className={`badge ${plan.is_active ? "badge-green" : "badge-neutral"}`}
                title={describeDuration(plan.duration_days)}
              >
                {plan.name} · {formatBdt(plan.price_bdt)}
                {off ? ` · −${off}%` : ""}
              </span>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="border-t border-white/[.06] p-5">
          <ProductForm
            product={product}
            onDone={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {expanded && (
        <div className="border-t border-white/[.06] p-5">
          <PlansEditor productId={product.id} plans={plans} />
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

function ProductForm({
  product,
  onDone,
}: {
  product?: SubProduct;
  onDone: () => void;
}) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    tagline: product?.tagline ?? "",
    description: product?.description ?? "",
    thumbnailUrl: product?.thumbnail_url ?? "",
    category: product?.category ?? "design",
    accessType: product?.access_type ?? "shared",
    deliveryType: product?.delivery_type ?? "credential",
    loginUrl: product?.login_url ?? "",
    features: (product?.features ?? []).join(", "),
    termsNote: product?.terms_note ?? "",
    sortOrder: String(product?.sort_order ?? 0),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Auto-slug while creating, but never silently rewrite a live slug —
  // the product page URL depends on it.
  function setName(name: string) {
    setForm((f) => ({ ...f, name, slug: isEdit ? f.slug : slugify(name) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      category: form.category || null,
      accessType: form.accessType,
      deliveryType: form.deliveryType,
      loginUrl: form.loginUrl.trim() || null,
      features: form.features
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      termsNote: form.termsNote.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    if (isEdit) payload.id = product!.id;

    const res = await callApi("/api/admin/sub/products", isEdit ? "PATCH" : "POST", payload);
    setBusy(false);

    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg(isEdit ? "Product updated." : "Product created.");
    onDone();
  }

  return (
    <form onSubmit={submit} className={isEdit ? "" : "card p-6"}>
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <span className="label">Product name</span>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adobe Creative Cloud"
          />
        </label>
        <label>
          <span className="label">Slug (URL)</span>
          <input
            className="input font-mono"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="adobe-creative-cloud"
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Tagline</span>
          <input
            className="input"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="All 20+ Adobe apps, official license"
          />
        </label>
        <label>
          <span className="label">Category</span>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Account type</span>
          <select
            className="input"
            value={form.accessType}
            onChange={(e) => setForm({ ...form, accessType: e.target.value as "personal" | "shared" })}
          >
            <option value="shared">Shared (team account)</option>
            <option value="personal">Personal (own account)</option>
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="label">How it is delivered</span>
          <select
            className="input"
            value={form.deliveryType}
            onChange={(e) =>
              setForm({ ...form, deliveryType: e.target.value as "credential" | "invite" })
            }
          >
            <option value="credential">Credential — we give them an email and password</option>
            <option value="invite">Invite — we invite their own account email into a panel</option>
          </select>
          <span className="muted mt-1 block text-xs">
            Pick <b>Invite</b> for anything like Canva where the customer keeps their own
            account. Checkout then asks for their account email, and the dashboard shows invite
            status instead of a password — handing over the panel password would let them
            remove every other member.
          </span>
        </label>
        <label>
          <span className="label">Thumbnail URL</span>
          <input
            className="input"
            type="url"
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            placeholder="https://..."
          />
        </label>
        <label>
          <span className="label">Default login URL</span>
          <input
            className="input"
            type="url"
            value={form.loginUrl}
            onChange={(e) => setForm({ ...form, loginUrl: e.target.value })}
            placeholder="https://account.adobe.com"
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Features (comma separated)</span>
          <input
            className="input"
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
            placeholder="All Adobe apps, 100GB cloud storage, Adobe Fonts"
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea
            className="input min-h-24"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">Terms note (shown on the product page)</span>
          <textarea
            className="input min-h-20"
            value={form.termsNote}
            onChange={(e) => setForm({ ...form, termsNote: e.target.value })}
            placeholder="This is a shared team account. Do not change the password or use the primary profile."
          />
          <span className="muted mt-1 block text-xs">
            For shared accounts, spell out the rules here. It cuts support tickets more than
            anything else on this page.
          </span>
        </label>
        <label>
          <span className="label">Sort order</span>
          <input
            className="input"
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {err && <p className="mr-auto text-sm text-[#ff8c8c]">{err}</p>}
        {msg && <p className="mr-auto text-sm text-[#ff8f9b]">{msg}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function PlansEditor({ productId, plans }: { productId: string; plans: SubPlan[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patchPlan(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    setErr(null);
    const res = await callApi("/api/admin/sub/plans", "PATCH", { id, ...payload });
    setBusyId(null);
    if (!res.ok) setErr(res.error);
    else router.refresh();
  }

  async function removePlan(id: string) {
    setBusyId(id);
    setErr(null);
    const res = await callApi("/api/admin/sub/plans", "DELETE", { id });
    setBusyId(null);
    if (!res.ok) setErr(res.error);
    else {
      if (res.data?.note) setErr(res.data.note);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-white">Duration plans</h4>
        <button className="btn-secondary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "＋ Add plan"}
        </button>
      </div>

      {err && <p className="mb-3 text-sm text-[#ffcf8c]">{err}</p>}

      {plans.length === 0 && !adding && (
        <p className="muted text-sm">
          No plans yet. A product without plans cannot be bought — add at least one duration.
        </p>
      )}

      {plans.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Compare at</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const off = discountPercent(
                  Number(plan.price_bdt),
                  plan.compare_at_bdt ? Number(plan.compare_at_bdt) : null,
                );
                return (
                  <tr key={plan.id}>
                    <td className="font-semibold text-white">{plan.name}</td>
                    <td className="muted">
                      {describeDuration(plan.duration_days)}
                      <span className="muted ml-1 text-xs">({plan.duration_days}d)</span>
                    </td>
                    <td className="font-semibold text-[#ff8f9b]">{formatBdt(plan.price_bdt)}</td>
                    <td className="muted">
                      {plan.compare_at_bdt ? (
                        <>
                          <s>{formatBdt(plan.compare_at_bdt)}</s>
                          {off ? <span className="ml-2 text-[#ff8f9b]">−{off}%</span> : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`badge ${plan.is_active ? "badge-green" : "badge-neutral"}`}>
                        {plan.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button
                        className="btn-secondary mr-2"
                        disabled={busyId === plan.id}
                        onClick={() => patchPlan(plan.id, { isActive: !plan.is_active })}
                      >
                        {plan.is_active ? "Hide" : "Show"}
                      </button>
                      <button
                        className="btn-danger"
                        disabled={busyId === plan.id}
                        onClick={() => removePlan(plan.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="mt-4 border-t border-white/[.06] pt-4">
          <PlanForm
            productId={productId}
            onDone={() => {
              setAdding(false);
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}

function PlanForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    name: "3 Months",
    durationDays: "90",
    priceBdt: "",
    compareAtBdt: "",
    sortOrder: "0",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyPreset(days: number, label: string) {
    setForm((f) => ({ ...f, durationDays: String(days), name: label }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const res = await callApi("/api/admin/sub/plans", "POST", {
      productId,
      name: form.name.trim(),
      durationDays: Number(form.durationDays),
      priceBdt: Number(form.priceBdt),
      compareAtBdt: form.compareAtBdt ? Number(form.compareAtBdt) : null,
      sortOrder: Number(form.sortOrder) || 0,
    });
    setBusy(false);
    if (!res.ok) setErr(res.error);
    else onDone();
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3 flex flex-wrap gap-2">
        {DURATION_PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            className="btn-secondary"
            onClick={() => applyPreset(p.days, p.label)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <label>
          <span className="label">Plan name</span>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Duration (days)</span>
          <input
            className="input"
            type="number"
            min={1}
            required
            value={form.durationDays}
            onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Price (৳)</span>
          <input
            className="input"
            type="number"
            min={0}
            required
            value={form.priceBdt}
            onChange={(e) => setForm({ ...form, priceBdt: e.target.value })}
            placeholder="2499"
          />
        </label>
        <label>
          <span className="label">Compare at (৳)</span>
          <input
            className="input"
            type="number"
            min={0}
            value={form.compareAtBdt}
            onChange={(e) => setForm({ ...form, compareAtBdt: e.target.value })}
            placeholder="optional"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {err && <p className="mr-auto text-sm text-[#ff8c8c]">{err}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Add plan"}
        </button>
      </div>
    </form>
  );
}
