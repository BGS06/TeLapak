"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { reportListingSchema } from "@/lib/validations";
import { getCurrentProfile } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

export async function createReportAction(raw: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu untuk melaporkan barang.");
  if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");

  const parsed = reportListingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali alasan laporanmu.";
    return fail(firstIssue, parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", parsed.data.listingId)
    .maybeSingle();

  if (!listing) return fail("Barang tidak ditemukan.");
  if (listing.seller_id === profile.id) {
    return fail("Kamu tidak bisa melaporkan barangmu sendiri.");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: profile.id,
    target_listing_id: listing.id,
    target_user_id: listing.seller_id,
    reason: parsed.data.reason,
  });

  if (error) return fail(mapDbError(error));

  revalidatePath("/admin");
  return ok(undefined, "Laporan terkirim. Terima kasih telah menjaga keamanan komunitas kampus.");
}
