"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to see your subscriptions and copy your logins.",
    cta: "Sign in",
  },
  signup: {
    title: "Create your account",
    subtitle: "You need an account so your login details have somewhere private to live.",
    cta: "Create account",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We will email you a link to set a new one.",
    cta: "Send reset link",
  },
  reset: {
    title: "Set a new password",
    subtitle: "Choose something you have not used elsewhere.",
    cta: "Save new password",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const copy = COPY[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.refresh();
        router.push("/dashboard");
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Please use at least 8 characters.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // When email confirmation is on, there is no session yet — say so
        // instead of pushing them to a dashboard that will bounce them back.
        if (!data.session) {
          setMsg("Check your email to confirm your address, then sign in.");
          setBusy(false);
          return;
        }
        router.refresh();
        router.push("/dashboard");
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMsg("If that address has an account, a reset link is on its way.");
        setBusy(false);
        return;
      }

      // reset
      if (password.length < 8) {
        throw new Error("Please use at least 8 characters.");
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("Password updated. Taking you to your dashboard…");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="shell py-16">
      <div className="card mx-auto max-w-md p-7 sm:p-9">
        <p className="eyebrow">{mode === "signup" ? "Get started" : "Account"}</p>
        <h1 className="mt-2 text-2xl font-black">{copy.title}</h1>
        <p className="muted mt-2 text-sm leading-6">{copy.subtitle}</p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="label">Your name</span>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahim Ahmed"
                autoComplete="name"
              />
            </label>
          )}

          {mode !== "reset" && (
            <label className="block">
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}

          {mode !== "forgot" && (
            <label className="block">
              <span className="label">
                {mode === "reset" ? "New password" : "Password"}
              </span>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "login" ? "" : "At least 8 characters"}
              />
            </label>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : copy.cta}
          </button>

          {err && (
            <p className="rounded-lg border border-[#ff6b6b]/25 bg-[#ff6b6b]/[.07] p-3 text-sm text-[#ff9d9d]">
              {err}
            </p>
          )}
          {msg && (
            <p className="rounded-lg border border-[#e5243b]/25 bg-[#e5243b]/[.07] p-3 text-sm text-[#9cf0b4]">
              {msg}
            </p>
          )}
        </form>

        <div className="muted mt-6 space-y-2 border-t border-white/[.06] pt-5 text-sm">
          {mode === "login" && (
            <>
              <p>
                No account yet?{" "}
                <Link href="/signup" className="text-[#e5243b] underline">
                  Create one
                </Link>
              </p>
              <p>
                <Link href="/forgot-password" className="text-[#e5243b] underline">
                  Forgot your password?
                </Link>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-[#e5243b] underline">
                Sign in
              </Link>
            </p>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <p>
              <Link href="/login" className="text-[#e5243b] underline">
                Back to sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
