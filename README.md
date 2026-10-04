# Subsdealer

Premium subscriptions resold in Bangladesh, paid with bKash.

Customers buy a plan, pay by bKash, and an admin verifies the payment by hand. Access is
then delivered one of two ways depending on the product:

| Delivery | What the customer gets | Example |
|---|---|---|
| `credential` | An email and password for an account we own | CapCut Pro, ChatGPT Plus |
| `invite` | An invite to **their own** account, so they keep their files | Canva Pro |

Built with Next.js 14 (App Router), Supabase (Postgres, Auth, RLS, Storage) and Resend.

---

## Setup

### 1. Install

```bash
npm install
```

> If `node_modules` already exists and looks half-finished, delete it first — it was
> created over a slow mount and may be incomplete.

### 2. Create a Supabase project

Make a **new, empty** project (call it `subdealer`). This app must not share a database
with anything else.

Then open **SQL Editor**, paste the whole of `RUN-THIS-IN-SUPABASE.sql`, and press Run.
That one file creates every table, function, policy, the private receipts bucket, and a
starting catalogue of three products.

### 3. Fill in `.env.local`

Three values come from **Project Settings → API** in the new project:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`CREDENTIAL_ENC_KEY` and `CRON_SECRET` are already generated for you.

> **Back up `CREDENTIAL_ENC_KEY` somewhere safe.** Every stored subscription password is
> encrypted with it. Lose it and none of them can ever be read again. Production and
> Preview must use the same value.

### 4. Make yourself an admin

Sign up through the site first, then in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Sign out and back in. `/admin` now works.

### 5. Run it

```bash
npm run dev
```

---

## Day-to-day

| Page | What it is for |
|---|---|
| `/admin/subscriptions` | Every subscription sold. Assign credentials, send invites, transfer teams, extend, revoke. |
| `/admin/subscriptions/payments` | The queue. Check the transaction against your bKash statement, then approve. |
| `/admin/sub-products` | Products and their duration plans. |
| `/admin/credentials` | The logins you hand out. Passwords are encrypted at rest. |
| `/admin/teams` | Shared-account groups and their seat limits. |

### Selling a credential product

1. Customer pays → the order lands in the payment queue.
2. You approve → a credential with a free slot is assigned automatically and the
   customer is emailed.
3. If the pool is empty the subscription waits in **Needs credential** — add a login
   under `/admin/credentials`, then assign it.

### Selling an invite product

1. Checkout asks the customer for **their own** account email.
2. You approve → they are put on a panel and appear under **Send invite**.
3. You send the real invite from the provider, then press **Mark as invited**. They get
   an email telling them to check their inbox and spam folder.

---

## How security is arranged

Worth knowing before changing anything:

- **Passwords are encrypted before they reach Postgres** (AES-256-GCM, `src/lib/crypto.ts`).
  A database dump without `CREDENTIAL_ENC_KEY` is useless. A CHECK constraint on
  `password_enc` means a plaintext password cannot be written to that column by accident.
- **`sub_credentials` has no RLS policy for ordinary users** — not even for a credential
  they are paying for. The only way a password leaves the database is
  `/api/subscriptions/reveal`, which checks ownership and expiry, enforces a rate limit,
  and writes an audit row every time.
- **Expiry is enforced on read, not by the cron.** The reveal route re-checks
  `expiry_date` on every request, so a missed cron run can never leak access. The daily
  job only keeps the badges and reminder emails honest.
- **Views use `security_invoker = true`.** Without it a Postgres view runs with the
  owner's rights and silently bypasses RLS, which would expose every login email.
- **The receipts bucket is private.** Admins read it through a 120-second signed URL.

---

## Daily cron

`vercel.json` schedules `/api/cron/expire-subscriptions` for 18:05 UTC, which is 00:05 in
Dhaka. It expires lapsed subscriptions and sends renewal reminders at 7, 3 and 1 days.
Vercel sends `CRON_SECRET` as a bearer token automatically.

To trigger it by hand:

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/expire-subscriptions
```

---

## Pricing notes

Prices in the seed were set in October 2026 against official list prices, converted at
1 USD = 123.3 BDT.

Canva is priced against the **local market**, not against cost. An invite costs nothing
to supply, local sellers go as low as ৳49/year, and competing down there attracts the
most support-hungry and least loyal customers. ৳399/year sits above the throwaway tier
and below the ৳599–850 mid tier.

Team capacities are deliberately well below what each account technically allows. A panel
may hold hundreds, but putting every customer on one means a single shutdown takes out
all of them. Spare panels are cheap; a mass outage is not.
