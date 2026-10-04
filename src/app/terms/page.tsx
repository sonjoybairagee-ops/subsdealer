import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";

export default function TermsPage() {
  return (
    <div className="shell max-w-3xl py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-3xl font-black">Terms of service</h1>
      <p className="muted mt-3 text-sm">Last updated: 2 October 2026</p>

      <div className="muted mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-lg font-black text-white">What you are buying</h2>
          <p className="mt-2">
            {BRAND} resells access to third-party subscription services. You are buying
            access for a fixed period, delivered either as login details or as an invite
            to your own account. Each product page says which.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">Shared accounts</h2>
          <p className="mt-2">
            Where a product is marked as a shared account, several customers use the same
            login. You must not change the password, the email address, or any account
            setting, and you must not pass your login to anyone else. Doing any of these
            ends your access without a refund, because it also cuts off everyone else on
            that account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">Invite-based products</h2>
          <p className="mt-2">
            Where a product is delivered as an invite, you keep your own account and your
            own files. Please stay in the team for the period you paid for — leaving it, or
            being removed for breaking the rules, ends your access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">Your period</h2>
          <p className="mt-2">
            Your subscription runs from the moment we verify your payment until the expiry
            date shown on your dashboard. Access stops automatically on that date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">Payments</h2>
          <p className="mt-2">
            Payments are made by bKash and verified by hand against our statement. Submitting
            a transaction ID that does not match a real payment, or one already used, gets
            the order rejected.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">We are not the provider</h2>
          <p className="mt-2">
            {BRAND} is not affiliated with, endorsed by, or acting on behalf of any of the
            services it resells. All product names and trademarks belong to their owners.
          </p>
        </section>
      </div>
    </div>
  );
}
