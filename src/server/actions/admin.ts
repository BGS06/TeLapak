"use server";

import { revalidatePath } from "next/cache";
import { payoutMethodLabel } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { markPayoutSchema, resolveDisputeSchema } from "@/lib/validations";
import { requireAdmin } from "@/server/auth";
import { sendEmail } from "@/server/email/send";
import { payoutSent, verificationDecision } from "@/server/email/templates";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";
import { getPaymentProvider, isPaymentProviderName } from "@/server/payments";

/**
 * 1. Tab Antrean Verifikasi (PRD §3 & §7.5):
 *    Setujui / Tolak bukti identitas alumni/dosen, lalu HAPUS file bukti dari
 *    private bucket `verification-docs` sesuai kebijakan privasi PRD §3.
 */
export async function reviewVerificationAction(input: {
  userId: string;
  decision: "verified" | "rejected";
  rejectionReason?: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");
  await requireAdmin();

  const reason = input.rejectionReason?.trim() ?? "";
  if (input.decision === "rejected" && reason.length < 5) {
    return fail("Tuliskan alasan penolakan minimal 5 karakter agar pengguna tahu apa yang perlu diperbaiki.");
  }

  const admin = getSupabaseAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, verification_doc_url")
    .eq("id", input.userId)
    .maybeSingle();

  if (!target) return fail("Pengguna tidak ditemukan.");

  // Hapus dokumen identitas dari private bucket segera setelah diverifikasi/ditinjau (PRD §3).
  if (target.verification_doc_url) {
    await admin.storage.from("verification-docs").remove([target.verification_doc_url]);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      verification_status: input.decision,
      verification_doc_url: null,
      verification_rejection_reason: input.decision === "rejected" ? reason : null,
    })
    .eq("id", target.id);

  if (error) return fail(mapDbError(error));

  await sendEmail({
    to: target.email,
    ...verificationDecision(input.decision === "verified", reason || undefined),
  });

  revalidatePath("/admin");
  return ok(
    undefined,
    input.decision === "verified"
      ? "Akun disetujui dan file bukti identitas telah dihapus dari penyimpanan."
      : "Verifikasi ditolak dan pengguna diberi tahu lewat email.",
  );
}

/**
 * 2. Tab Pesanan & Sengketa (PRD §5 & §7.5):
 *    Putuskan `refund_buyer` (proses refund ke gateway + kembalikan status) atau
 *    `release_seller` (teruskan dana ke buku besar pencairan penjual).
 */
export async function resolveDisputeAction(raw: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");
  const adminProfile = await requireAdmin();

  const parsed = resolveDisputeSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Periksa kembali putusan sengketa.";
    return fail(firstIssue);
  }

  const admin = getSupabaseAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order) return fail("Pesanan tidak ditemukan.");
  if (order.status !== "disputed") {
    return fail("Pesanan ini tidak lagi berstatus sengketa.");
  }

  if (parsed.data.resolution === "refund_buyer") {
    const providerName = isPaymentProviderName(order.payment_provider) ? order.payment_provider : "mock";
    const provider = getPaymentProvider(providerName);
    try {
      await provider.processRefund({
        orderId: order.id,
        reference: order.payment_reference,
        amountIdr: order.total_paid_idr,
        reason: parsed.data.adminNotes,
      });
    } catch (err) {
      console.error("[admin:refund] Gagal memproses refund ke gateway", err);
      return fail(
        "Refund otomatis ke gateway gagal. Pastikan saldo/status transaksi di dashboard gateway mencukupi.",
      );
    }
  }

  const { error } = await admin.rpc("resolve_dispute", {
    p_order_id: parsed.data.orderId,
    p_admin: adminProfile.id,
    p_resolution: parsed.data.resolution,
    p_admin_notes: parsed.data.adminNotes,
    p_remove_listing: parsed.data.removeListing,
  });

  if (error) return fail(mapDbError(error));

  revalidatePath("/");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/admin");
  return ok(
    undefined,
    parsed.data.resolution === "refund_buyer"
      ? "Sengketa diputuskan: dana dikembalikan ke pembeli."
      : "Sengketa diputuskan: dana diteruskan ke buku besar pencairan penjual.",
  );
}

/**
 * 3. Tab Pencairan Dana / Payout (PRD §6, §7.5, §9):
 *    Tandai seluruh saldo `ready_to_payout` milik penjual sudah ditransfer menjadi `paid_out`,
 *    lalu kirim email notifikasi pencairan dana ke penjual.
 */
export async function markPayoutPaidAction(raw: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");
  const adminProfile = await requireAdmin();

  const parsed = markPayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Masukkan referensi transfer.");
  }

  const admin = getSupabaseAdminClient();
  const { data: seller } = await admin
    .from("profiles")
    .select("email, payout_method, payout_account_number, payout_account_name")
    .eq("id", parsed.data.sellerId)
    .maybeSingle();

  if (!seller) return fail("Penjual tidak ditemukan.");

  const { data: rows, error } = await admin.rpc("mark_payout_paid", {
    p_seller_id: parsed.data.sellerId,
    p_admin: adminProfile.id,
    p_transfer_reference: parsed.data.transferReference,
  });

  if (error) return fail(mapDbError(error));

  const summary = rows?.[0];
  if (!summary || summary.entry_count === 0) {
    return fail("Tidak ada saldo berstatus siap dicairkan untuk penjual ini.");
  }

  await sendEmail({
    to: seller.email,
    ...payoutSent({
      amountIdr: Number(summary.total_idr),
      entryCount: summary.entry_count,
      transferReference: parsed.data.transferReference,
      destination: `${payoutMethodLabel(seller.payout_method)} • ${seller.payout_account_number ?? "-"} a.n. ${seller.payout_account_name ?? "-"}`,
    }),
  });

  revalidatePath("/admin");
  revalidatePath("/profile");
  return ok(undefined, "Pencairan dana berhasil dicatat dan email bukti transfer dikirim ke penjual.");
}

/**
 * 4. Tab Laporan (PRD §7.5):
 *    Turunkan Barang (`take_down`), Suspend Pengguna (`suspend_user`), atau Abaikan (`dismiss`).
 */
export async function moderateReportAction(input: {
  reportId: string;
  action: "take_down" | "suspend_user" | "dismiss";
}): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");
  const adminProfile = await requireAdmin();

  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc("moderate_report", {
    p_report_id: input.reportId,
    p_admin: adminProfile.id,
    p_action: input.action,
  });

  if (error) return fail(mapDbError(error));

  revalidatePath("/");
  revalidatePath("/admin");
  const message =
    input.action === "take_down"
      ? "Barang telah diturunkan dari katalog."
      : input.action === "suspend_user"
        ? "Pengguna ditangguhkan dan seluruh barang aktifnya diturunkan."
        : "Laporan ditutup.";
  return ok(undefined, message);
}

/**
 * 5. Uji kirim email transaksional (Resend) ke email admin yang sedang login.
 */
export async function sendTestEmailAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");
  const adminProfile = await requireAdmin();

  if (!process.env.RESEND_API_KEY?.trim()) {
    return fail(
      "RESEND_API_KEY belum diisi di .env.local / Vercel Environment Variables. Email masih berjalan di mode log konsol.",
    );
  }

  await sendEmail({
    to: adminProfile.email,
    subject: "[TeLapak] Uji Koneksi Email Transaksional Resend Berhasil",
    text: `Halo ${adminProfile.full_name},\n\nIni adalah email uji coba dari Panel Admin TeLapak. Integrasi Resend untuk notifikasi pembayaran, pengingat H+2, sengketa, dan pencairan dana telah aktif.`,
    html: `<p>Halo <strong>${adminProfile.full_name}</strong>,</p><p>Ini adalah email uji coba dari <strong>Panel Admin TeLapak</strong>. Integrasi <strong>Resend</strong> untuk notifikasi pembayaran, pengingat H+2, sengketa, dan pencairan dana sudah aktif.</p>`,
  });

  return ok(undefined, `Email uji coba berhasil dikirim ke ${adminProfile.email}.`);
}
