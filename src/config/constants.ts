import type { Enums } from "@/types/database";

export const CATEGORIES: { value: Enums<"listing_category">; label: string }[] = [
  { value: "elektronik", label: "Elektronik & Gadget" },
  { value: "buku", label: "Buku & Modul" },
  { value: "fashion", label: "Fashion Kampus" },
  { value: "sepatu", label: "Sepatu & Tas" },
  { value: "parfum", label: "Parfum & Care" },
  { value: "aksesoris", label: "Aksesoris" },
  { value: "kos", label: "Perlengkapan Kos" },
  { value: "hobi", label: "Hobi & Olahraga" },
  { value: "praktikum", label: "Alat Praktikum" },
  { value: "lainnya", label: "Lainnya" },
];

export const CONDITIONS: { value: Enums<"listing_condition">; label: string; badge: string }[] = [
  { value: "like_new", label: "Seperti baru", badge: "Seperti baru ✓" },
  { value: "good", label: "Bekas baik", badge: "Bekas baik ✓" },
  { value: "fair", label: "Bekas layak pakai", badge: "Layak pakai" },
];

export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
export const conditionOf = (v: string) => CONDITIONS.find((c) => c.value === v);

export const USER_TYPE_LABEL: Record<Enums<"user_type">, string> = {
  student: "Mahasiswa",
  lecturer: "Dosen",
  alumni: "Alumni",
};

export const VERIFICATION_LABEL: Record<Enums<"verification_status">, string> = {
  pending: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Verifikasi ditolak",
};

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export const ORDER_STATUS: Record<Enums<"order_status">, { label: string; tone: Tone; hint: string }> = {
  pending_payment: {
    label: "Menunggu pembayaran",
    tone: "warning",
    hint: "Selesaikan pembayaran sebelum batas waktu agar barang tidak dilepas.",
  },
  paid_held: {
    label: "Dana ditahan sementara",
    tone: "info",
    hint: "Pembayaran aman di platform sampai pembeli menerima barang.",
  },
  completed: { label: "Selesai", tone: "success", hint: "Transaksi selesai. Dana diteruskan ke penjual." },
  disputed: {
    label: "Dalam peninjauan",
    tone: "danger",
    hint: "Ada laporan masalah. Admin sedang meninjau bukti dari kedua pihak.",
  },
  refunded: { label: "Dana dikembalikan", tone: "neutral", hint: "Dana sudah dikembalikan ke pembeli." },
  expired: { label: "Kedaluwarsa", tone: "neutral", hint: "Pesanan tidak dibayar tepat waktu." },
  cancelled: { label: "Dibatalkan", tone: "neutral", hint: "Pesanan dibatalkan sebelum pembayaran." },
};

export const LISTING_STATUS: Record<Enums<"listing_status">, { label: string; tone: Tone }> = {
  active: { label: "Tersedia", tone: "success" },
  reserved: { label: "Sedang dipesan", tone: "warning" },
  sold: { label: "Terjual", tone: "neutral" },
  removed: { label: "Disembunyikan", tone: "neutral" },
};

export const PAYOUT_STATUS: Record<Enums<"payout_status">, { label: string; tone: Tone }> = {
  pending_release: { label: "Ditahan", tone: "info" },
  ready_to_payout: { label: "Siap dicairkan", tone: "success" },
  paid_out: { label: "Sudah ditransfer", tone: "neutral" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const PAYOUT_METHODS: { value: string; label: string; kind: "bank" | "ewallet" }[] = [
  { value: "bca", label: "BCA", kind: "bank" },
  { value: "bni", label: "BNI", kind: "bank" },
  { value: "bri", label: "BRI", kind: "bank" },
  { value: "mandiri", label: "Mandiri", kind: "bank" },
  { value: "bsi", label: "BSI", kind: "bank" },
  { value: "jago", label: "Bank Jago", kind: "bank" },
  { value: "seabank", label: "SeaBank", kind: "bank" },
  { value: "gopay", label: "GoPay", kind: "ewallet" },
  { value: "ovo", label: "OVO", kind: "ewallet" },
  { value: "dana", label: "DANA", kind: "ewallet" },
  { value: "shopeepay", label: "ShopeePay", kind: "ewallet" },
];

export const payoutMethodLabel = (v: string | null) =>
  PAYOUT_METHODS.find((m) => m.value === v)?.label ?? v ?? "-";

/** Pesan error standar (PRD §9). Jangan diubah tanpa persetujuan produk. */
export const MESSAGES = {
  listingTaken:
    "Maaf, barang ini sedang dalam proses pembayaran oleh pembeli lain. Silakan cek kembali beberapa saat lagi.",
  emailDomain: "Gunakan email resmi kampus yang terdaftar, atau pilih jalur verifikasi alumni/dosen.",
  sellerIncomplete: "Lengkapi nomor WhatsApp dan rekening pencairan terlebih dahulu sebelum memasang barang.",
  invalidPhoto: "Format foto harus JPG/PNG/WebP dengan ukuran maksimal 5 MB per foto.",
} as const;
