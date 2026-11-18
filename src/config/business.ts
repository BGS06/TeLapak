/**
 * Parameter bisnis LapakTelu (PRD §10 — "Keputusan Terbuka").
 * Nilai di bawah adalah default sementara; kunci sebelum go-live.
 * Jika MIN_LISTING_PRICE_IDR diubah, sesuaikan juga CHECK constraint
 * `listings.price_idr` di migrasi database.
 */
export const BUSINESS = {
  /** Nama produk yang tampil di UI, email, dan metadata. */
  productName: "LapakTelu",
  tagline: "Jual beli barang bekas antar civitas kampus, aman & tanpa ribet.",

  /** Komisi platform yang dipotong dari penjual (basis point; 300 = 3%). */
  platformFeeBps: 300,
  /** Biaya gateway (QRIS ~0,7%) yang ditanggung pembeli saat checkout. */
  gatewayFeeBps: 70,

  /** Harga minimum barang. */
  minListingPriceIdr: 10_000,
  /** Harga maksimum barang (pagar pengaman input). */
  maxListingPriceIdr: 100_000_000,
  /** Saldo minimum sebelum admin mentransfer pencairan ke penjual. */
  minPayoutIdr: 50_000,

  /** Batas waktu pembayaran sebelum pesanan kedaluwarsa. */
  paymentTtlMinutes: 60,
  /** Dana otomatis diteruskan ke penjual setelah sekian jam tanpa aksi pembeli. */
  autoReleaseHours: 72,
  /** Pengingat konfirmasi dikirim saat sisa waktu auto-release tinggal sekian jam (H+2). */
  reminderBeforeReleaseHours: 24,

  /** Batas foto per barang & ukuran file. */
  maxListingPhotos: 4,
  maxPhotoBytes: 5 * 1024 * 1024,
  allowedPhotoTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

/** Estimasi biaya — dihitung ulang & dikunci oleh database saat pesanan dibuat. */
export function calculateFees(priceIdr: number) {
  const platformFee = Math.round((priceIdr * BUSINESS.platformFeeBps) / 10_000);
  const gatewayFee = Math.ceil((priceIdr * BUSINESS.gatewayFeeBps) / 10_000);
  return {
    itemPrice: priceIdr,
    platformFee,
    gatewayFee,
    totalPaid: priceIdr + gatewayFee,
    sellerNet: priceIdr - platformFee,
  };
}
