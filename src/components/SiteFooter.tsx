import Link from "next/link";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Subsdealer";
const WHATSAPP_GROUP =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP || "https://chat.whatsapp.com/DPALbG2Oe2Q6AHEtmt3znC";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/[.06] py-10">
      <div className="shell flex flex-col gap-6">
        {WHATSAPP_GROUP && (
          <a
            href={WHATSAPP_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/[.08] px-4 py-3 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/[.14]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.516 5.26l-.999 3.648 3.472-.91zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.074-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            Join our WhatsApp community — offers, updates &amp; support
          </a>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="muted text-sm">
            © {new Date().getFullYear()} {BRAND} · Dhaka, Bangladesh
          </p>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/subscriptions" className="muted hover:text-white">
              Subscriptions
            </Link>
            {WHATSAPP_GROUP && (
              <a
                href={WHATSAPP_GROUP}
                target="_blank"
                rel="noopener noreferrer"
                className="muted hover:text-white"
              >
                WhatsApp
              </a>
            )}
            <Link href="/terms" className="muted hover:text-white">
              Terms
            </Link>
            <Link href="/refund" className="muted hover:text-white">
              Refund policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
