import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}
