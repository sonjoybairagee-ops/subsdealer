import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  const groups: { heading: string | null; links: [string, string, string][] }[] = [
    {
      heading: null,
      links: [
        ["📊", "Overview", "/admin/overview"],
        ["📦", "Orders", "/admin/orders"],
        ["◉", "Subscriptions", "/admin/subscriptions"],
      ],
    },
    {
      heading: "Money",
      links: [
        ["📈", "Financial Analytics", "/admin/analytics"],
        ["৳", "Payments", "/admin/subscriptions/payments"],
      ],
    },
    {
      heading: "Catalogue",
      links: [["🛒", "Products & plans", "/admin/sub-products"]],
    },
    {
      heading: "Supply & Logs",
      links: [
        ["🔑", "Credentials", "/admin/credentials"],
        ["👥", "Teams", "/admin/teams"],
        ["📨", "Live OTP Logs", "/admin/otp-logs"],
      ],
    },
  ];

  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-8 xl:px-12">
      <div className="dashboard-grid">
        <aside className="sidebar card p-3">
          <div className="mb-3 hidden px-3 py-3 md:block">
            <span className="badge badge-green">Admin</span>
            <p className="muted mt-3 truncate text-xs">{admin.email}</p>
          </div>
          {groups.map((group, gi) => (
            <div key={group.heading ?? `group-${gi}`} className={gi > 0 ? "mt-3" : ""}>
              {group.heading && (
                <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7280] md:block">
                  {group.heading}
                </p>
              )}
              {group.links.map(([icon, name, href]) => (
                <Link
                  key={name}
                  href={href}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#aab0bd] hover:bg-white/[.05] hover:text-white"
                >
                  <span className="text-[#e5243b]">{icon}</span>
                  <span className="whitespace-nowrap">{name}</span>
                </Link>
              ))}
            </div>
          ))}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
