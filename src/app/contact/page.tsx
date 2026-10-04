import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact" };

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";
const SUPPORT = process.env.SUPPORT_EMAIL || "support@example.com";

export default function ContactPage() {
  return (
    <div className="shell max-w-2xl py-16">
      <p className="eyebrow">Support</p>
      <h1 className="mt-2 text-3xl font-black">Get in touch</h1>
      <p className="muted mt-3 leading-7">
        A problem with an order, a login that stopped working, or a question before you
        buy — message us and we will sort it out.
      </p>

      <div className="card mt-8 p-6">
        <p className="label">Email</p>
        <a href={`mailto:${SUPPORT}`} className="font-mono text-lg font-bold text-[#e5243b]">
          {SUPPORT}
        </a>
        <p className="muted mt-4 text-sm leading-6">
          Please include your <b className="text-white">bKash transaction ID</b> and the
          product name. That is what we search by, so it gets your answer back fastest.
        </p>
      </div>

      <div className="card mt-5 border border-[#e5243b]/25 p-6">
        <p className="font-bold text-white">Login not working?</p>
        <p className="muted mt-2 text-sm leading-7">
          Check your{" "}
          <Link href="/dashboard" className="text-[#e5243b] underline">
            dashboard
          </Link>{" "}
          first — if we rotated the account, the new details are already there. For
          invite-based products, check your spam folder before writing to us; that is where
          the invite usually is.
        </p>
      </div>

      <p className="muted mt-8 text-sm leading-6">
        {BRAND} is not affiliated with any of the services it resells. All product names
        and trademarks belong to their owners.
      </p>
    </div>
  );
}
