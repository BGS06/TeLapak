"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sellerProfileSchema } from "@/lib/validations";
import { getCurrentProfile } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

/**
 * Menyimpan data Tingkat 2 (nomor WhatsApp + rekening/e-wallet pencairan).
 * Nama pemilik rekening wajib sesuai nama lengkap akun (PRD §3).
 */
export async function updateSellerProfileAction(raw: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu.");
  if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");

  const parsed = sellerProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali data profilmu.";
    return fail(firstIssue, parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      whatsapp_number: parsed.data.whatsappNumber,
      payout_method: parsed.data.payoutMethod,
      payout_account_number: parsed.data.payoutAccountNumber,
      payout_account_name: parsed.data.payoutAccountName,
    })
    .eq("id", profile.id);

  if (error) return fail(mapDbError(error));

  revalidatePath("/profile");
  revalidatePath("/sell");
  return ok(undefined, "Profil dan rekening pencairan berhasil disimpan.");
}

/**
 * Mencatat path foto bukti identitas alumni/dosen yang sudah diunggah ke
 * private bucket `verification-docs` untuk ditinjau manual oleh admin (PRD §3).
 */
export async function submitVerificationDocAction(storagePath: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu.");
  if (profile.verification_status === "verified") {
    return ok(undefined, "Akunmu sudah terverifikasi.");
  }

  const cleanPath = storagePath.trim();
  if (!cleanPath.startsWith(`${profile.id}/`)) {
    return fail("Lokasi file bukti tidak valid.");
  }

  const admin = getSupabaseAdminClient();

  // Hapus file bukti lama jika pengguna mengunggah ulang setelah ditolak.
  if (profile.verification_doc_url && profile.verification_doc_url !== cleanPath) {
    await admin.storage.from("verification-docs").remove([profile.verification_doc_url]);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      verification_doc_url: cleanPath,
      verification_status: "pending",
      verification_rejection_reason: null,
    })
    .eq("id", profile.id);

  if (error) return fail(mapDbError(error));

  revalidatePath("/profile");
  revalidatePath("/admin");
  return ok(undefined, "Bukti identitas berhasil dikirim. Admin akan meninjau dalam 1×24 jam.");
}
