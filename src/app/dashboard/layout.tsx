import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="shell py-10 sm:py-14">{children}</div>
  );
}
