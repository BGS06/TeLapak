"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS } from "@/config/business";
import { payoutMethodLabel } from "@/config/constants";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { openDisputeSchema } from "@/lib/validations";
import { canBuy, getCurrentProfile } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";
import { notifyDisputeOpened, notifyPaymentReceived } from "@/server/order-notifications";
import { getPaymentProvider } from "@/server/payments";

/**
 * Pembeli klik "Beli Sekarang" → membuat pesanan `pending_payment`, mengunci
 * barang menjadi `reserved`, lalu membuat invoice QRIS/e-wallet lewat PaymentProvider.
 */
export async function checkoutListingAction(
  listingId: string,
): Promise<ActionResult<{ orderId: string; paymentUrl: string }>> {
  try {
    if (!isSupabaseConfigured) {
      return fail("Supabase belum dikonfigurasi. Hubungkan Environment Variables untuk menguji checkout.");
    }

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu untuk membeli barang.");
    if (!canBuy(profile)) {
      return fail("Akunmu harus terverifikasi sebelum dapat membeli barang.");
    }

    const provider = getPaymentProvider();
    const admin = getSupabaseAdminClient();

    const { data: rawOrder, error: createError } = await admin.rpc("create_order", {
      p_buyer_id: profile.id,
      p_listing_id: listingId,
      p_platform_fee_bps: BUSINESS.platformFeeBps,
      p_gateway_fee_bps: BUSINESS.gatewayFeeBps,
      p_provider: provider.name,
      p_payment_ttl: `${BUSINESS.paymentTtlMinutes} minutes`,
    });

    const order = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;
    if (createError || !order) {
      return fail(mapDbError(createError));
    }

    // Jika pesanan pending yang sama sudah punya URL pembayaran, gunakan kembali.
    if (order.payment_url) {
      const safeUrl =
        order.payment_provider === "mock" ? `/pay/mock/${order.id}` : order.payment_url;
      return ok({ orderId: order.id, paymentUrl: safeUrl });
    }

    const { data: listing } = await admin
      .from("listings")
      .select("title")
      .eq("id", listingId)
      .maybeSingle();

    try {
      const invoice = await provider.createInvoice({
        orderId: order.id,
        amountIdr: order.total_paid_idr,
        itemName: listing?.title ?? "Barang TeLapak",
        itemPriceIdr: order.item_price_idr,
        serviceFeeIdr: order.gateway_fee_idr,
        customer: { name: profile.full_name, email: profile.email },
        expiresInMinutes: BUSINESS.paymentTtlMinutes,
        returnUrl: `${publicEnv.siteUrl}/orders/${order.id}`,
      });

      await admin
        .from("orders")
        .update({
          payment_reference: invoice.reference,
          payment_url: invoice.paymentUrl,
        })
        .eq("id", order.id);

      revalidatePath("/");
      revalidatePath(`/items/${listingId}`);
      revalidatePath("/orders");
      return ok({ orderId: order.id, paymentUrl: invoice.paymentUrl });
    } catch (err) {
      console.error("[checkout] Gagal membuat invoice pembayaran, membatalkan reservasi", err);
      await admin.rpc("cancel_order", { p_order_id: order.id, p_actor: profile.id });
      return fail("Gagal menghubungkan ke penyedia pembayaran. Silakan coba beberapa saat lagi.");
    }
  } catch (err) {
    console.error("[checkoutListingAction] Unexpected server error:", err);
    return fail(
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan pada server saat membuat pesanan.",
    );
  }
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const admin = getSupabaseAdminClient();
    const { error } = await admin.rpc("cancel_order", {
      p_order_id: orderId,
      p_actor: profile.id,
    });

    if (error) return fail(mapDbError(error));

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return ok(undefined, "Pesanan dibatalkan dan barang kembali tersedia.");
  } catch (err) {
    console.error("[cancelOrderAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal membatalkan pesanan.");
  }
}

export async function confirmOrderReceivedAction(orderId: string): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const admin = getSupabaseAdminClient();
    const { error } = await admin.rpc("confirm_order_received", {
      p_order_id: orderId,
      p_actor: profile.id,
    });

    if (error) return fail(mapDbError(error));

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return ok(
      undefined,
      "Terima kasih! Transaksi selesai dan dana diteruskan ke buku besar pencairan penjual.",
    );
  } catch (err) {
    console.error("[confirmOrderReceivedAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal mengonfirmasi penerimaan barang.");
  }
}

export async function openDisputeAction(raw: unknown): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const parsed = openDisputeSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali laporan masalahmu.";
      return fail(firstIssue, parsed.error.flatten().fieldErrors);
    }

    const invalidPath = parsed.data.evidencePaths.find(
      (p) => !p.startsWith(`${profile.id}/${parsed.data.orderId}/`),
    );
    if (invalidPath) {
      return fail("Lokasi file bukti tidak valid.");
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin.rpc("open_dispute", {
      p_order_id: parsed.data.orderId,
      p_actor: profile.id,
      p_reason: parsed.data.reason,
      p_evidence: parsed.data.evidencePaths,
    });

    if (error) return fail(mapDbError(error));

    await notifyDisputeOpened(parsed.data.orderId, parsed.data.reason);

    revalidatePath("/orders");
    revalidatePath(`/orders/${parsed.data.orderId}`);
    revalidatePath("/admin");
    return ok(
      undefined,
      "Laporan masalah berhasil dikirim. Pencairan dana ditahan sementara hingga admin selesai meninjau.",
    );
  } catch (err) {
    console.error("[openDisputeAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal mengirim laporan masalah.");
  }
}

export async function addDisputeEvidenceAction(
  orderId: string,
  storagePaths: string[],
): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    if (!storagePaths.length || storagePaths.length > 4) {
      return fail("Unggah 1–4 foto bukti.");
    }
    const invalidPath = storagePaths.find((p) => !p.startsWith(`${profile.id}/${orderId}/`));
    if (invalidPath) return fail("Lokasi file bukti tidak valid.");

    const admin = getSupabaseAdminClient();
    const { error } = await admin.rpc("add_dispute_evidence", {
      p_order_id: orderId,
      p_actor: profile.id,
      p_paths: storagePaths,
    });

    if (error) return fail(mapDbError(error));

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/admin");
    return ok(undefined, "Bukti tambahan berhasil diunggah.");
  } catch (err) {
    console.error("[addDisputeEvidenceAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal mengunggah bukti tambahan.");
  }
}

/**
 * Simulasi pembayaran QRIS (PAYMENT_PROVIDER=mock).
 * Menjalankan fungsi database dan pengiriman email yang sama persis dengan webhook gateway.
 */
export async function completeMockPaymentAction(orderId: string): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const admin = getSupabaseAdminClient();
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return fail("Pesanan tidak ditemukan.");
    if (order.buyer_id !== profile.id && profile.role !== "admin") {
      return fail("Kamu tidak memiliki akses ke pesanan ini.");
    }
    if (order.payment_provider !== "mock") {
      return fail("Pesanan ini menggunakan penyedia pembayaran nyata.");
    }

    const { data: result, error } = await admin.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_payment_reference: `MOCK-${orderId}`,
    });

    if (error) return fail(mapDbError(error));
    if (result === "needs_refund") {
      await admin.rpc("mark_late_payment_refunded", { p_order_id: orderId });
      return fail(
        "Pesanan sudah kedaluwarsa dan barang tidak lagi tersedia. Dana otomatis dikembalikan.",
      );
    }

    if (result === "paid") {
      await notifyPaymentReceived(orderId);
    }

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return ok(
      undefined,
      "Pembayaran diterima! Dana ditahan sementara & nomor WhatsApp penjual kini terbuka.",
    );
  } catch (err) {
    console.error("[completeMockPaymentAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal memverifikasi pembayaran.");
  }
}

export { payoutMethodLabel };
