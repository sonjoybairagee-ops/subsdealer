"use client";

import { useState } from "react";

interface DashboardAccountDetailsProps {
  profile: {
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
}

export function DashboardAccountDetails({ profile }: DashboardAccountDetailsProps) {
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [displayName, setDisplayName] = useState(
    profile?.display_name || profile?.full_name || profile?.email?.split("@")[0] || ""
  );
  const email = profile?.email || "";

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setProfileMessage({ type: "success", text: "Account details updated successfully!" });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message || "An unexpected error occurred" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and Confirm password do not match." });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setPasswordMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to update password" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Form (Matching Images 2 & 4) */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 sm:p-8 space-y-6">
        <h2 className="text-xl font-black text-white">Account Details</h2>

        {profileMessage && (
          <div
            className={`rounded-xl p-4 text-xs font-semibold border ${
              profileMessage.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">First name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Last name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">Display name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-white/40">
              This will be how your name will be displayed in the account section and in reviews
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">Email address *</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/60 cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-[#ffb703] px-6 py-3 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 hover:bg-[#e0a100] disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      {/* Password Change Section (Matching Image 2 & 4) */}
      <div className="rounded-2xl border border-white/10 bg-[#161922] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-white">Password change</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/70">OPTIONAL</span>
        </div>

        {passwordMessage && (
          <div
            className={`rounded-xl p-4 text-xs font-semibold border ${
              passwordMessage.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Current password (leave blank to leave unchanged)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              New password (leave blank to leave unchanged)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3 text-xs text-white placeholder-white/30 focus:border-[#ffb703] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword || (!currentPassword && !newPassword)}
            className="rounded-xl bg-[#ffb703] px-6 py-3 text-xs font-bold text-[#0d0f14] shadow-md shadow-[#ffb703]/20 hover:bg-[#e0a100] disabled:opacity-50"
          >
            {savingPassword ? "Updating..." : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
