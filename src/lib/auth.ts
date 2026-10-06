import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  phone: string | null;
  role: "user" | "admin";
  is_banned: boolean;
  wallet_balance?: number;
  created_at: string;
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

/**
 * Returns the profile only if this user is an admin, otherwise null.
 *
 * The role lives in the profiles table, and the RLS policy on that table
 * blocks a user from editing their own role — so nobody can promote
 * themselves by writing to it from the browser.
 */
export async function requireAdmin(): Promise<Profile | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.is_banned) return null;
  return profile;
}
