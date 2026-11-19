"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

/**
 * Mengirim rating bintang 1–5 dan ulasan pembeli setelah pesanan selesai (`completed`).
 */
export async function submitOrderReviewAction(input: {
  orderId: string;
  rating: number;
  comment: string;
}): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const rating = Math.round(Number(input.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return fail("Pilih rating antara 1 hingga 5 bintang.");
    }

    const comment = input.comment.trim();
    if (comment.length < 5) {
      return fail("Tulis ulasan singkat minimal 5 karakter.");
    }
    if (comment.length > 600) {
      return fail("Ulasan maksimal 600 karakter.");
    }

    const admin = getSupabaseAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, listing_id, buyer_id, seller_id, status")
      .eq("id", input.orderId)
      .maybeSingle();

    if (!order) return fail("Pesanan tidak ditemukan.");
    if (order.buyer_id !== profile.id) {
      return fail("Hanya pembeli pesanan ini yang dapat memberikan rating & ulasan.");
    }
    if (order.status !== "completed") {
      return fail("Rating & ulasan hanya dapat diberikan setelah pesanan selesai diterima.");
    }

    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (existing) {
      return fail("Kamu sudah memberikan rating & ulasan untuk transaksi ini.");
    }

    const { error } = await admin.from("reviews").insert({
      order_id: order.id,
      listing_id: order.listing_id,
      seller_id: order.seller_id,
      reviewer_id: profile.id,
      rating,
      comment,
    });

    if (error) return fail(mapDbError(error));

    revalidatePath(`/orders/${order.id}`);
    revalidatePath(`/items/${order.listing_id}`);
    revalidatePath("/profile");
    return ok(undefined, "Terima kasih! Rating & ulasanmu berhasil ditambahkan.");
  } catch (err) {
    console.error("[submitOrderReviewAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal menyimpan ulasan.");
  }
}
