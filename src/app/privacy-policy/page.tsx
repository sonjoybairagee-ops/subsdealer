import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | iformat.io",
  description: "Privacy policy for iformat.io - Explaining our 100% client-side data privacy commitment.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Privacy Policy</h1>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs text-sm text-slate-700 leading-relaxed space-y-5">
        <p><strong>Last Updated: October 2026</strong></p>

        <h2 className="text-lg font-bold text-slate-900">1. Client-Side Processing Guarantee</h2>
        <p>
          Your privacy is paramount. Unlike conventional online file converters, <strong>iformat.io does not upload, copy, or store your images or files on our servers</strong>. All image compression, formatting conversions, resizing, and cropping occur locally inside your device&apos;s browser memory via modern web APIs.
        </p>

        <h2 className="text-lg font-bold text-slate-900">2. Information We Do Not Collect</h2>
        <p>
          We do not require account registration, email addresses, or phone numbers to use any of our tools. We never collect or inspect the content of your files.
        </p>

        <h2 className="text-lg font-bold text-slate-900">3. Cookies and Advertising Partners</h2>
        <p>
          We may use third-party advertising partners, such as Google AdSense, to serve advertisements when you visit our website. These companies may use cookies and web beacons to collect non-personally identifiable information (such as your browser type, time of visit, and referring website) to display relevant ads.
        </p>
        <p>
          You may customize or opt out of personalized advertising by visiting Google&apos;s Ads Settings (<a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">adssettings.google.com</a>).
        </p>

        <h2 className="text-lg font-bold text-slate-900">4. Contact Information</h2>
        <p>
          If you have questions regarding this Privacy Policy, please email us at <strong>privacy@iformat.io</strong>.
        </p>
      </div>
    </div>
  );
}
