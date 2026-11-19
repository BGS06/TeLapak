"use server";

import { revalidatePath } from "next/cache";
import { MESSAGES } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listingSchema } from "@/lib/validations";
import { getCurrentProfile, sellerReadiness } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

export async function createListingAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi. Lengkapi .env.local untuk memasang barang.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu.");
  if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");
  if (profile.verification_status !== "verified") {
    return fail("Akunmu harus terverifikasi sebelum memasang barang.");
  }

  const readiness = sellerReadiness(profile);
  if (!readiness.whatsapp || !readiness.payout) {
    return fail(MESSAGES.sellerIncomplete);
  }

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali isian barangmu.";
    return fail(firstIssue, parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  const { data: campus } = await supabase
    .from("campuses")
    .select("meeting_points")
    .eq("id", profile.campus_id)
    .maybeSingle();

  if (campus?.meeting_points?.length && !campus.meeting_points.includes(parsed.data.meetingPoint)) {
    return fail("Pilih salah satu titik temu resmi kampus.", {
      meetingPoint: ["Pilih salah satu titik temu resmi kampus."],
    });
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      campus_id: profile.campus_id,
      seller_id: profile.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      condition: parsed.data.condition,
      price_idr: parsed.data.priceIdr,
      meeting_point: parsed.data.meetingPoint,
      meeting_point_note: parsed.data.meetingPointNote,
      image_urls: parsed.data.imageUrls,
    })
    .select("id")
    .single();

  if (error || !data) return fail(mapDbError(error));

  revalidatePath("/");
  revalidatePath("/profile");
  return ok({ id: data.id }, "Barang berhasil dipasang!");
}

export async function updateListingAction(
  listingId: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured) {
    return fail("Supabase belum dikonfigurasi.");
  }

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu.");

  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali isian barangmu.";
    return fail(firstIssue, parsed.error.flatten().fieldErrors);
  }

  const supabase = await getSupabaseServerClient();
  const { data: campus } = await supabase
    .from("campuses")
    .select("meeting_points")
    .eq("id", profile.campus_id)
    .maybeSingle();

  if (campus?.meeting_points?.length && !campus.meeting_points.includes(parsed.data.meetingPoint)) {
    return fail("Pilih salah satu titik temu resmi kampus.", {
      meetingPoint: ["Pilih salah satu titik temu resmi kampus."],
    });
  }

  const { error } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      condition: parsed.data.condition,
      price_idr: parsed.data.priceIdr,
      meeting_point: parsed.data.meetingPoint,
      meeting_point_note: parsed.data.meetingPointNote,
      image_urls: parsed.data.imageUrls,
    })
    .eq("id", listingId)
    .eq("seller_id", profile.id);

  if (error) return fail(mapDbError(error));

  revalidatePath("/");
  revalidatePath(`/items/${listingId}`);
  revalidatePath("/profile");
  return ok({ id: listingId }, "Perubahan barang berhasil disimpan.");
}

export async function toggleListingVisibilityAction(
  listingId: string,
  nextStatus: "active" | "removed",
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

  const profile = await getCurrentProfile();
  if (!profile) return fail("Silakan masuk terlebih dahulu.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("listings")
    .update({ status: nextStatus })
    .eq("id", listingId)
    .eq("seller_id", profile.id);

  if (error) return fail(mapDbError(error));

  revalidatePath("/");
  revalidatePath(`/items/${listingId}`);
  revalidatePath(`/sellers/${profile.id}`);
  revalidatePath("/profile");
  return ok(
    undefined,
    nextStatus === "active"
      ? "Barang ditampilkan kembali di katalog."
      : "Barang diarsipkan dari katalog.",
  );
}

export async function deleteMyListingAction(listingId: string): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const admin = getSupabaseAdminClient();
    const { data: listing } = await admin
      .from("listings")
      .select("id, seller_id, status, taken_down_at")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing || listing.seller_id !== profile.id) {
      return fail("Barang tidak ditemukan atau bukan milikmu.");
    }
    if (listing.status === "reserved" || listing.status === "sold") {
      return fail("Barang yang sedang dipesan atau sudah terjual tidak dapat dihapus.");
    }
    if (listing.taken_down_at) {
      return fail("Barang yang diturunkan admin tidak dapat dihapus sendiri.");
    }

    const { count: orderCount } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listing.id);

    if ((orderCount ?? 0) > 0) {
      // Tetap jaga integritas riwayat pesanan: arsipkan saja
      await admin.from("listings").update({ status: "removed" }).eq("id", listing.id);
      revalidatePath("/");
      revalidatePath(`/items/${listing.id}`);
      revalidatePath(`/sellers/${profile.id}`);
      revalidatePath("/profile");
      return ok(
        undefined,
        "Barang memiliki riwayat pesanan sehingga diarsipkan dari katalog (tidak dihapus permanen).",
      );
    }

    const { error } = await admin
      .from("listings")
      .delete()
      .eq("id", listing.id)
      .eq("seller_id", profile.id);

    if (error) return fail(mapDbError(error));

    revalidatePath("/");
    revalidatePath(`/sellers/${profile.id}`);
    revalidatePath("/profile");
    return ok(undefined, "Barang berhasil dihapus dari etalase.");
  } catch (err) {
    console.error("[deleteMyListingAction] Error:", err);
    return fail("Gagal menghapus barang.");
  }
}
