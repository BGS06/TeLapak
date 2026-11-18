import { MESSAGES } from "@/config/constants";

/** Hasil standar Server Action — selalu serializable, tidak pernah melempar ke klien. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const ok = <T = undefined>(data?: T, message?: string): ActionResult<T> => ({
  ok: true,
  data: data as T,
  message,
});

export const fail = (error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

/** Kode exception dari fungsi database (raise exception '<KODE>'). */
const DB_ERROR_MESSAGES: Record<string, string> = {
  LISTING_UNAVAILABLE: MESSAGES.listingTaken,
  LISTING_NOT_FOUND: "Barang tidak ditemukan atau sudah tidak tersedia.",
  OWN_LISTING: "Kamu tidak bisa membeli barangmu sendiri.",
  CAMPUS_MISMATCH: "Barang ini berada di kampus lain. Transaksi lintas kampus belum tersedia.",
  BUYER_NOT_ELIGIBLE: "Akunmu belum terverifikasi atau sedang ditangguhkan, sehingga belum bisa membeli.",
  ORDER_NOT_FOUND: "Pesanan tidak ditemukan.",
  FORBIDDEN: "Kamu tidak memiliki akses untuk tindakan ini.",
  INVALID_ORDER_STATE: "Status pesanan sudah berubah. Muat ulang halaman untuk melihat status terbaru.",
  DISPUTE_WINDOW_CLOSED: "Batas waktu 3 hari untuk melaporkan masalah sudah lewat.",
  EVIDENCE_LIMIT: "Jumlah bukti sudah mencapai batas maksimal (10 foto).",
  LISTING_LOCKED: "Barang yang sedang dipesan atau sudah terjual tidak bisa diubah.",
  LISTING_TAKEN_DOWN: "Barang ini telah diturunkan oleh admin dan tidak bisa diubah.",
  LISTING_INVALID_STATUS: "Status barang tidak valid.",
  REPORT_NOT_OPEN: "Laporan ini sudah ditindaklanjuti.",
  TRANSFER_REFERENCE_REQUIRED: "Isi nomor referensi transfer.",
  INVALID_ACTION: "Tindakan tidak valid untuk laporan ini.",
  CAMPUS_NOT_FOUND: "Kampus tidak ditemukan atau belum aktif.",
  EMAIL_DOMAIN_NOT_ALLOWED: MESSAGES.emailDomain,
};

type PgLikeError = { message?: string; code?: string; details?: string | null } | null | undefined;

export function mapDbError(error: PgLikeError, fallback = "Terjadi kesalahan. Silakan coba lagi."): string {
  if (!error) return fallback;
  const code = Object.keys(DB_ERROR_MESSAGES).find((k) => error.message?.includes(k));
  if (code) return DB_ERROR_MESSAGES[code]!;
  if (error.code === "23505" && error.message?.includes("orders_one_open_per_listing")) {
    return MESSAGES.listingTaken;
  }
  if (error.code === "23505" && error.message?.includes("reports_one_open_per_listing")) {
    return "Kamu sudah melaporkan barang ini. Laporanmu sedang ditinjau admin.";
  }
  if (error.code === "42501") return "Kamu tidak memiliki akses untuk tindakan ini.";
  return fallback;
}
