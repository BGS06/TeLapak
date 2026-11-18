import { z } from "zod";
import { BUSINESS } from "@/config/business";
import { CATEGORIES, CONDITIONS, MESSAGES, PAYOUT_METHODS } from "@/config/constants";
import { normalizeName, normalizeWhatsApp } from "@/lib/utils";

const categoryValues = CATEGORIES.map((c) => c.value) as [
  (typeof CATEGORIES)[number]["value"],
  ...(typeof CATEGORIES)[number]["value"][],
];
const conditionValues = CONDITIONS.map((c) => c.value) as [
  (typeof CONDITIONS)[number]["value"],
  ...(typeof CONDITIONS)[number]["value"][],
];
const payoutMethodValues = PAYOUT_METHODS.map((m) => m.value) as [string, ...string[]];

// ---------------------------------------------------------------------
// Autentikasi (PRD §3)
// ---------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Masukkan alamat email yang valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

export const registerSchema = z.object({
  campusId: z.string().uuid("Pilih kampus asalmu."),
  fullName: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter.")
    .max(80, "Nama lengkap maksimal 80 karakter."),
  userType: z.enum(["student", "lecturer", "alumni"], {
    message: "Pilih peranmu di kampus.",
  }),
  email: z.string().trim().toLowerCase().email("Masukkan alamat email yang valid."),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(72, "Kata sandi maksimal 72 karakter."),
});

// ---------------------------------------------------------------------
// Profil & Syarat Penjual Tingkat 2 (PRD §3)
// ---------------------------------------------------------------------
export const sellerProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Nama lengkap minimal 2 karakter.")
      .max(80, "Nama lengkap maksimal 80 karakter."),
    whatsappNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        const normalized = normalizeWhatsApp(val);
        if (!normalized) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Masukkan nomor WhatsApp Indonesia yang aktif (contoh: 081234567890).",
          });
          return z.NEVER;
        }
        return normalized;
      }),
    payoutMethod: z.enum(payoutMethodValues, {
      message: "Pilih bank atau e-wallet tujuan pencairan.",
    }),
    payoutAccountNumber: z
      .string()
      .trim()
      .regex(/^[0-9]{6,20}$/, "Nomor rekening / e-wallet harus berupa 6–20 digit angka."),
    payoutAccountName: z
      .string()
      .trim()
      .min(2, "Nama pemilik rekening wajib diisi.")
      .max(80, "Nama pemilik rekening maksimal 80 karakter."),
  })
  .refine((data) => normalizeName(data.payoutAccountName) === normalizeName(data.fullName), {
    path: ["payoutAccountName"],
    message: "Nama pemilik rekening wajib sama persis dengan nama lengkap akun.",
  });

// ---------------------------------------------------------------------
// Form Pasang & Ubah Barang (PRD §7.3)
// ---------------------------------------------------------------------
export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Judul barang minimal 5 karakter.")
    .max(80, "Judul barang maksimal 80 karakter."),
  category: z.enum(categoryValues, { message: "Pilih kategori barang." }),
  condition: z.enum(conditionValues, { message: "Pilih kondisi barang." }),
  priceIdr: z.coerce
    .number({ message: "Masukkan harga dalam angka bulat." })
    .int("Harga harus berupa angka bulat.")
    .min(
      BUSINESS.minListingPriceIdr,
      `Harga minimal Rp ${BUSINESS.minListingPriceIdr.toLocaleString("id-ID")}.`,
    )
    .max(
      BUSINESS.maxListingPriceIdr,
      `Harga maksimal Rp ${BUSINESS.maxListingPriceIdr.toLocaleString("id-ID")}.`,
    ),
  meetingPoint: z
    .string()
    .trim()
    .min(2, "Pilih titik temu di dalam kampus.")
    .max(120, "Nama titik temu terlalu panjang."),
  meetingPointNote: z
    .string()
    .trim()
    .max(160, "Catatan titik temu maksimal 160 karakter.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z
    .string()
    .trim()
    .min(20, "Deskripsi minimal 20 karakter (jelaskan kondisi jujur, kelengkapan, atau minus).")
    .max(1000, "Deskripsi maksimal 1.000 karakter."),
  imageUrls: z
    .array(
      z
        .string()
        .refine(
          (val) =>
            val.startsWith("https://") ||
            val.startsWith("http://") ||
            val.startsWith("data:image/"),
          "URL foto tidak valid.",
        ),
    )
    .min(1, "Unggah minimal 1 foto barang.")
    .max(BUSINESS.maxListingPhotos, `Maksimal ${BUSINESS.maxListingPhotos} foto per barang.`),
});

// ---------------------------------------------------------------------
// Sengketa & Laporan (PRD §5, §7.4, §7.5)
// ---------------------------------------------------------------------
export const openDisputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Jelaskan kronologi atau ketidaksesuaian barang minimal 10 karakter.")
    .max(1000, "Alasan laporan maksimal 1.000 karakter."),
  evidencePaths: z
    .array(z.string().min(3))
    .max(4, "Maksimal 4 foto bukti pada saat membuka laporan.")
    .default([]),
});

export const reportListingSchema = z.object({
  listingId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Jelaskan alasan laporan minimal 10 karakter (mis. indikasi barang KW/palsu).")
    .max(500, "Alasan laporan maksimal 500 karakter."),
});

export const resolveDisputeSchema = z.object({
  orderId: z.string().uuid(),
  resolution: z.enum(["refund_buyer", "release_seller"]),
  adminNotes: z.string().trim().min(5, "Tulis catatan putusan minimal 5 karakter.").max(500),
  removeListing: z.boolean().default(false),
});

export const markPayoutSchema = z.object({
  sellerId: z.string().uuid(),
  transferReference: z
    .string()
    .trim()
    .min(3, "Masukkan nomor referensi bukti transfer bank/e-wallet.")
    .max(120),
});

/** Validasi file gambar sebelum diunggah (PRD §7.3 & §9). */
export function validateImageFile(file: File): string | null {
  const allowed = BUSINESS.allowedPhotoTypes as readonly string[];
  if (!allowed.includes(file.type)) {
    return MESSAGES.invalidPhoto;
  }
  if (file.size > BUSINESS.maxPhotoBytes) {
    return MESSAGES.invalidPhoto;
  }
  return null;
}
