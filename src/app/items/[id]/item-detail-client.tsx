"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatIDR } from "@/lib/utils";
import { toggleListingVisibilityAction } from "@/server/actions/listings";
import { checkoutListingAction } from "@/server/actions/orders";
import { createReportAction } from "@/server/actions/reports";
import type { Listing } from "@/types/database";

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = images.length;
  const current = images[activeIndex] ?? images[0] ?? "";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[#e6e0d6] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={`${title} — foto ${activeIndex + 1}`} className="h-full w-full object-cover" />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i - 1 + total) % total)}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e6e0d6] bg-white/90 text-[#181512] shadow-sm hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((i) => (i + 1) % total)}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e6e0d6] bg-white/90 text-[#181512] shadow-sm hover:bg-white cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-[#181512]/75 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
              {activeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                idx === activeIndex
                  ? "border-[#b3261e] ring-2 ring-[#b3261e]/20"
                  : "border-[#e6e0d6] opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ItemActionsProps {
  listing: Listing;
  conditionLabel: string;
  campusName: string;
  shareUrl: string;
  isLoggedIn: boolean;
  isOwnListing: boolean;
  isBuyerVerified: boolean;
  totalWithGatewayIdr: number;
  gatewayFeeIdr: number;
}

export function ItemActions({
  listing,
  conditionLabel,
  campusName,
  shareUrl,
  isLoggedIn,
  isOwnListing,
  isBuyerVerified,
  totalWithGatewayIdr,
  gatewayFeeIdr,
}: ItemActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleBuy = () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`);
      return;
    }
    if (!isBuyerVerified) {
      toast.error("Akunmu masih menunggu verifikasi sebelum dapat membeli barang.");
      router.push("/profile");
      return;
    }

    startTransition(async () => {
      const res = await checkoutListingAction(listing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pesanan dibuat! Mengarahkan ke halaman pembayaran...");
      window.location.href = res.data.paymentUrl;
    });
  };

  const handleShareWhatsApp = () => {
    const text = [
      `*${listing.title}*`,
      `Harga: *${formatIDR(listing.price_idr)}* (${conditionLabel})`,
      `Titik temu: ${listing.meeting_point} — ${campusName}`,
      "",
      `Beli aman (dana ditahan sementara sampai serah terima):`,
      shareUrl,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Tautan barang disalin! Siap ditempel ke grup WhatsApp.");
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  };

  const handleToggleVisibility = () => {
    const nextStatus = listing.status === "active" ? "removed" : "active";
    startTransition(async () => {
      const res = await toggleListingVisibilityAction(listing.id, nextStatus);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`);
      return;
    }
    setReportSubmitting(true);
    try {
      const res = await createReportAction({
        listingId: listing.id,
        reason: reportReason,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setReportReason("");
      setReportOpen(false);
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kotak Perlindungan Transaksi & Biaya */}
      <div className="rounded-2xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#146c43]" />
          <div className="text-xs leading-relaxed text-[#181512]">
            <p className="font-bold text-[#146c43]">Perlindungan Transaksi Kampus</p>
            <p className="mt-0.5 text-[#3d3833]">
              Dana ditahan sementara di platform. Nomor WhatsApp penjual otomatis terbuka setelah
              pembayaran terkonfirmasi, dan dana baru diteruskan ke penjual saat kamu menekan{" "}
              <strong>“Barang Diterima”</strong> di titik temu.
            </p>
            <p className="mt-1.5 text-[11px] text-[#57524c] tabular-nums">
              Estimasi bayar checkout: <strong>{formatIDR(totalWithGatewayIdr)}</strong> (termasuk
              biaya QRIS {formatIDR(gatewayFeeIdr)}).
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Utama: Beli Sekarang / Kelola Barang Milik Sendiri */}
      {isOwnListing ? (
        <div className="rounded-2xl border border-[#e6e0d6] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#57524c]">Ini adalah barang milikmu</span>
            <Badge tone={listing.status === "active" ? "success" : "warning"}>
              {listing.status === "active"
                ? "Aktif di Katalog"
                : listing.status === "reserved"
                  ? "Sedang Dipesan"
                  : listing.status === "sold"
                    ? "Terjual"
                    : "Disembunyikan"}
            </Badge>
          </div>

          {(listing.status === "active" || listing.status === "removed") && !listing.taken_down_at && (
            <div className="grid grid-cols-2 gap-2.5">
              <Button asChild variant="secondary" size="md">
                <Link href={`/items/${listing.id}/edit`}>
                  <Edit3 className="h-4 w-4" />
                  Ubah Barang
                </Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={isPending}
                onClick={handleToggleVisibility}
              >
                {listing.status === "active" ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Sembunyikan
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Tampilkan
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : listing.status === "active" ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={handleBuy}
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Memproses Pesanan...
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              Beli Sekarang • {formatIDR(listing.price_idr)}
            </>
          )}
        </Button>
      ) : (
        <div className="rounded-2xl border border-[#f8deb0] bg-[#fef6e6] px-4 py-3.5 text-center text-xs font-semibold text-[#92400e]">
          {listing.status === "reserved"
            ? "Maaf, barang ini sedang dalam proses pembayaran oleh pembeli lain. Silakan cek kembali beberapa saat lagi."
            : "Barang ini sudah terjual."}
        </div>
      )}

      {/* Tombol Sekunder: Bagikan ke WhatsApp & Salin Tautan */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="whatsapp"
          size="md"
          className="sm:col-span-2"
          onClick={handleShareWhatsApp}
        >
          <Share2 className="h-4 w-4" />
          Bagikan ke WhatsApp
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={handleCopyLink}>
          <Copy className="h-4 w-4" />
          Salin Link
        </Button>
      </div>

      {/* Tautan Laporkan Barang (PRD §7.2) */}
      {!isOwnListing && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#857e76] hover:text-[#b3261e] cursor-pointer"
          >
            <Flag className="h-3.5 w-3.5" />
            Laporkan Barang (indikasi palsu / terlarang)
          </button>
        </div>
      )}

      {/* Modal Laporan Barang */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e6e0d6] bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#181512]">Laporkan Barang</h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-lg p-1 text-[#857e76] hover:bg-[#f3efe9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-[#57524c]">
              Bantu jaga kepercayaan komunitas kampus dari barang KW/palsu, curian, atau barang
              terlarang.
            </p>

            <form onSubmit={handleSubmitReport} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#181512]">
                  Alasan Laporan
                </label>
                <Textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Contoh: Batch code parfum tidak sesuai kemasan original / indikasi barang KW..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setReportOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={reportSubmitting}>
                  {reportSubmitting ? "Mengirim..." : "Kirim Laporan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
