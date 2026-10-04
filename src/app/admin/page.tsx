import { redirect } from "next/navigation";

// There is only one thing an admin starts from here, so skip the empty
// overview page and send them straight to the work queue.
export default function AdminIndexPage() {
  redirect("/admin/subscriptions");
}
