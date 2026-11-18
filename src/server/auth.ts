import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/** User yang sedang login (divalidasi ke server Supabase Auth). Di-cache per request. */
export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

/** Profil lengkap milik user yang login (atau null). Di-cache per request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

/** Untuk halaman privat: kembalikan profil atau arahkan ke halaman masuk. */
export async function requireProfile(nextPath: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return profile;
}

/** Untuk halaman/aksi admin: selain admin akan melihat 404 (tidak membocorkan keberadaan panel). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.is_suspended) notFound();
  return profile;
}

/** Kelengkapan data Tingkat 2 (syarat menjadi penjual, PRD §3). */
export function sellerReadiness(profile: Profile) {
  const checks = {
    verified: profile.verification_status === "verified",
    whatsapp: Boolean(profile.whatsapp_number),
    payout: Boolean(
      profile.payout_method && profile.payout_account_number && profile.payout_account_name,
    ),
    notSuspended: !profile.is_suspended,
  };
  return { ...checks, ready: Object.values(checks).every(Boolean) };
}

export const canBuy = (profile: Profile) =>
  profile.verification_status === "verified" && !profile.is_suspended;
