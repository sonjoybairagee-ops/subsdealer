import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | subsdealer.com",
  description: "Terms and conditions for utilizing the subsdealer.com web application and utilities.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Terms of Service</h1>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs text-sm text-slate-700 leading-relaxed space-y-5">
        <p><strong>Effective Date: October 2026</strong></p>

        <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By accessing or using subsdealer.com (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please refrain from using our service.
        </p>

        <h2 className="text-lg font-bold text-slate-900">2. Description of Service</h2>
        <p>
          subsdealer.com provides client-side file conversion, compression, and image manipulation tools free of charge directly within your browser.
        </p>

        <h2 className="text-lg font-bold text-slate-900">3. Intellectual Property Rights</h2>
        <p>
          You retain full ownership of all images and materials you process through the Service. subsdealer.com claims no intellectual property rights over any user-supplied content.
        </p>

        <h2 className="text-lg font-bold text-slate-900">4. Disclaimer of Warranties</h2>
        <p>
          The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind.
        </p>
      </div>
    </div>
  );
}
