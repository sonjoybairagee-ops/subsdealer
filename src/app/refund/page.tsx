import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundPage() {
  return (
    <div className="shell max-w-3xl py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-3xl font-black">Refund policy</h1>
      <p className="muted mt-3 text-sm">Last updated: 2 October 2026</p>

      <div className="card mt-8 border border-[#e5243b]/25 p-6">
        <p className="font-bold text-white">The short version</p>
        <p className="muted mt-2 leading-7">
          If something stops working, we replace it. We do not refund money once access has
          been delivered.
        </p>
      </div>

      <div className="muted mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-lg font-black text-white">If an account stops working</h2>
          <p className="mt-2">
            Contact support. We move you to a working account or send a fresh invite, for
            the rest of the period you paid for, at no extra cost. This is the remedy for
            every access problem.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">When you can get your money back</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>We never delivered access and cannot deliver it.</li>
            <li>You were charged twice for the same order.</li>
            <li>Your payment was taken but the order was rejected in error.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">When you cannot</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>You changed your mind after access was delivered.</li>
            <li>You lost access by changing the password or account settings.</li>
            <li>You shared your login with someone else.</li>
            <li>A feature you expected turned out not to be included — product pages list what you get, so please read them before paying.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black text-white">How to ask</h2>
          <p className="mt-2">
            Message us with your transaction ID and what went wrong. Everything you bought is
            listed on your{" "}
            <Link href="/dashboard" className="text-[#e5243b] underline">
              dashboard
            </Link>
            , which is the fastest way for us to find your order.
          </p>
        </section>
      </div>
    </div>
  );
}
