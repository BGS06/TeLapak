"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  MessageCircle,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { validateAndCompressImage } from "@/lib/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { orderCode } from "@/lib/utils";
import {
  addDisputeEvidenceAction,
  cancelOrderAction,
  confirmOrderReceivedAction,
  openDisputeAction,
} from "@/server/actions/orders";
import { submitOrderReviewAction } from "@/server/actions/reviews";

export function PendingPaymentActions({
  orderId,
  paymentUrl,
  isBuyer,
}: {
  orderId: string;
  paymentUrl: string | null;
  isBuyer: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!isBuyer) return null;

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelOrderAction(orderId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  const safePaymentUrl = paymentUrl?.includes("/pay/mock/")
    ? `/pay/mock/${orderId}`
    : paymentUrl;

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      {safePaymentUrl && (
        <Button asChild variant="primary" size="lg" className="flex-1">
          <a href={safePaymentUrl}>
            Bayar Sekarang (QRIS / E-Wallet)
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={isPending}
        onClick={handleCancel}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
        Batalkan Pesanan
      </Button>
    </div>
  );
}

export function PaidHeldActions({
  orderId,
  userId,
  isBuyer,
  itemTitle,
  meetingPoint,
  sellerWhatsapp,
  sellerName,
}: {
  orderId: string;
  userId: string;
  isBuyer: boolean;
  itemTitle: string;
  meetingPoint: string;
  sellerWhatsapp: string | null;
  sellerName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidencePaths, setEvidencePaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleChatSeller = () => {
    if (!sellerWhatsapp) {
      toast.error("Nomor WhatsApp penjual tidak ditemukan.");
      return;
    }
    const text = [
      `Halo Kak ${sellerName}, saya pembeli *${itemTitle}* di TeLapak (Pesanan *${orderCode(orderId)}*).`,
      `Pembayaran sudah berhasil dan dana ditahan sementara di platform.`,
      `Kapan kita bisa janjian serah terima di *${meetingPoint}*?`,
    ].join("\n");
    window.open(
      `https://wa.me/${sellerWhatsapp}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleConfirmReceived = () => {
    startTransition(async () => {
      const res = await confirmOrderReceivedAction(orderId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setConfirmModalOpen(false);
      router.refresh();
    });
  };

  const handleUploadDisputeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - evidencePaths.length);
    e.target.value = "";
    if (!files.length) return;

    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const added: string[] = [];

    for (const file of files) {
      try {
        const compressed = await validateAndCompressImage(file);
        const path = `${userId}/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
        const { error } = await supabase.storage
          .from("dispute-evidence")
          .upload(path, compressed, { contentType: "image/webp" });
        if (error) {
          toast.error(`Gagal mengunggah bukti: ${error.message}`);
          continue;
        }
        added.push(path);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memproses foto bukti.");
      }
    }

    setEvidencePaths((prev) => [...prev, ...added].slice(0, 4));
    setUploading(false);
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await openDisputeAction({
        orderId,
        reason,
        evidencePaths,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setDisputeModalOpen(false);
      router.refresh();
    });
  };

  if (!isBuyer) {
    return (
      <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5 text-xs text-[#57524c]">
        Pembeli sudah dapat melihat nomor WhatsApp-mu untuk janjian di{" "}
        <strong className="text-[#181512]">{meetingPoint}</strong>. Saat serah terima, minta pembeli
        menekan tombol <strong className="text-[#181512]">“Barang Diterima”</strong> di ponselnya
        agar dana langsung masuk ke buku besar pencairanmu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tombol Chat Penjual via WhatsApp (wa.me/62...) */}
      {sellerWhatsapp && (
        <Button
          type="button"
          variant="whatsapp"
          size="lg"
          className="w-full"
          onClick={handleChatSeller}
        >
          <MessageCircle className="h-5 w-5" />
          Chat Penjual via WhatsApp
        </Button>
      )}

      {/* Tombol Barang Diterima & Laporkan Masalah (PRD §5 & §7.4) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={isPending}
          onClick={() => setConfirmModalOpen(true)}
        >
          <CheckCircle2 className="h-5 w-5" />
          Barang Diterima
        </Button>
        <Button
          type="button"
          variant="danger"
          size="lg"
          disabled={isPending}
          onClick={() => setDisputeModalOpen(true)}
        >
          <AlertTriangle className="h-5 w-5" />
          Laporkan Masalah
        </Button>
      </div>

      {/* Modal / Bottom Sheet Konfirmasi Barang Diterima (responsif di Android & iOS) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-2xs sm:items-center sm:p-4">
          <div className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#e6e0d6] bg-white p-5 pb-safe shadow-xl space-y-4 sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-[#d9dfdf] sm:hidden" />
            <h3 className="text-base font-bold text-[#181512]">
              Konfirmasi Barang Sudah Diterima?
            </h3>
            <p className="text-xs leading-relaxed text-[#57524c]">
              Pastikan kamu sudah memeriksa fisik barang secara langsung di titik temu dan kondisinya
              sesuai deskripsi. Setelah dikonfirmasi, transaksi dinyatakan selesai dan dana
              diteruskan ke penjual.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
              >
                Periksa Lagi
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPending}
                onClick={handleConfirmReceived}
              >
                {isPending ? "Memproses..." : "Ya, Barang Sesuai & Diterima"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet Laporkan Masalah / Sengketa (responsif di Android & iOS) */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-2xs sm:items-center sm:p-4">
          <div className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#e6e0d6] bg-white p-5 pb-safe shadow-xl sm:rounded-2xl sm:pb-5">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d9dfdf] sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#181512]">Laporkan Masalah Transaksi</h3>
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="rounded-lg p-1.5 text-[#857e76] hover:bg-[#f3efe9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#57524c]">
              Pencairan otomatis 72 jam akan dihentikan sementara. Admin akan meninjau bukti dari
              kedua pihak untuk memutuskan pengembalian dana (refund) atau pencairan.
            </p>

            <form onSubmit={handleSubmitDispute} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#181512]">
                  Kronologi / Alasan Masalah
                </label>
                <Textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan masalahnya: misalnya barang tidak sesuai deskripsi, penjual tidak hadir di titik temu, atau sepakat batal di tempat..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#181512]">
                  Foto Bukti Pendukung ({evidencePaths.length}/4 — opsional)
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfc6b8] bg-[#faf8f5] px-3 py-2.5 text-xs font-semibold text-[#181512] hover:border-[#b3261e]">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#b3261e]" />
                      Mengunggah bukti...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 text-[#b3261e]" />
                      Unggah Foto Bukti (JPG/PNG/WebP)
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploading || evidencePaths.length >= 4}
                    onChange={handleUploadDisputeFiles}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDisputeModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending || uploading}
                >
                  {isPending ? "Mengirim..." : "Tahan Pencairan & Kirim Laporan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function DisputeEvidenceUploader({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    e.target.value = "";
    if (!files.length) return;

    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const paths: string[] = [];

    for (const file of files) {
      try {
        const compressed = await validateAndCompressImage(file);
        const path = `${userId}/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
        const { error } = await supabase.storage
          .from("dispute-evidence")
          .upload(path, compressed, { contentType: "image/webp" });
        if (error) {
          toast.error(error.message);
          continue;
        }
        paths.push(path);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto.");
      }
    }

    if (paths.length) {
      const res = await addDisputeEvidenceAction(orderId, paths);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message);
        router.refresh();
      }
    }
    setUploading(false);
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#dcd5c9] bg-white px-3.5 py-2 text-xs font-semibold text-[#181512] hover:bg-[#f3efe9]">
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[#b3261e]" />
          Mengunggah bukti...
        </>
      ) : (
        <>
          <ImagePlus className="h-4 w-4 text-[#b3261e]" />
          Tambah Foto Bukti Sengketa
        </>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={uploading}
        onChange={handleUpload}
        className="hidden"
      />
    </label>
  );
}

const QUICK_REVIEW_TAGS = [
  "Barang sesuai deskripsi & foto",
  "Kondisi mulus & sangat terawat",
  "Penjual ramah & tepat waktu di titik COD",
  "Harga sepadan dengan kualitas",
] as const;

/**
 * Form Rating Bintang 1-5 & Ulasan Pembeli setelah pesanan selesai (`completed`).
 */
export function OrderReviewForm({
  orderId,
  sellerName,
}: {
  orderId: string;
  sellerName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeStars = hoverRating ?? rating;
  const ratingLabels: Record<number, string> = {
    1: "1 — Sangat Kurang",
    2: "2 — Kurang Sesuai",
    3: "3 — Cukup Baik",
    4: "4 — Bagus & Sesuai",
    5: "5 — Sangat Memuaskan!",
  };

  const handleAddTag = (tag: string) => {
    setComment((prev) => {
      if (prev.includes(tag)) return prev;
      return prev.trim() ? `${prev.trim()}. ${tag}` : tag;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitOrderReviewAction({
        orderId,
        rating,
        comment,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pilihan Bintang 1-5 Interaktif */}
      <div>
        <span className="block text-xs font-bold text-[#171717]">
          Bagaimana pengalaman transaksi COD dengan {sellerName}?
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                aria-label={`Beri ${star} bintang`}
                className="cursor-pointer rounded-md p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    star <= activeStars
                      ? "fill-[#f59e0b] text-[#f59e0b]"
                      : "text-[#d9dfdf]"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="rounded-md bg-[#fef6e6] px-2.5 py-1 text-xs font-bold text-[#92400e]">
            {ratingLabels[activeStars]}
          </span>
        </div>
      </div>

      {/* Chip Kalimat Cepat */}
      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-[#8c8c8c]">
          Klik untuk menambahkan ke ulasan:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REVIEW_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAddTag(tag)}
              className="cursor-pointer rounded-full border border-[#d9dfdf] bg-[#f2f4f4] px-2.5 py-1 text-[11px] font-medium text-[#171717] transition hover:border-[#b3261e] hover:bg-[#fdf2f2] hover:text-[#b3261e]"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-[#171717]">
          Tulis Ulasan Barang & Penjual
        </label>
        <Textarea
          required
          minLength={5}
          maxLength={600}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ceritakan kondisi barang saat kamu terima di titik temu kampus..."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan Ulasan...
            </>
          ) : (
            <>
              <Star className="h-4 w-4 fill-current" />
              Kirim Rating & Ulasan
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
