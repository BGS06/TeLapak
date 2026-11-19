"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Flag,
  HandCoins,
  Loader2,
  MessageSquare,
  Share2,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { BUSINESS } from "@/config/business";
import { formatIDR } from "@/lib/utils";
import { sendOfferAction, startOrOpenConversationAction } from "@/server/actions/chat";
import { toggleListingVisibilityAction } from "@/server/actions/listings";
import { checkoutListingAction } from "@/server/actions/orders";
import { createReportAction } from "@/server/actions/reports";
import type { Listing } from "@/types/database";

/**
 * Galeri Foto dengan dukungan swipe sentuh (Android/iOS) + tombol panah + thumbnail.
 */
export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;
  const current = images[activeIndex] ?? images[0] ?? "";

  const prev = () => setActiveIndex((i) => (i - 1 + total) % total);
  const next = () => setActiveIndex((i) => (i + 1) % total);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (total <= 1 || touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 36) {
      if (delta < 0) next();
      else prev();
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Foto Utama Galeri (Swipeable di mobile) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#edf2f2] bg-[#f2f4f4] select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`${title} — foto ${activeIndex + 1}`}
          decoding="async"
          className="h-full w-full object-cover transition-opacity duration-200"
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#edf2f2] bg-white/95 text-[#171717] shadow-xs transition hover:bg-white active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#edf2f2] bg-white/95 text-[#171717] shadow-xs transition hover:bg-white active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="tabular-nums absolute bottom-3 right-3 rounded-md bg-[#171717]/75 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-xs">
              {activeIndex + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* Baris Thumbnail */}
      {total > 1 && (
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all active:scale-95 ${
                idx === activeIndex
                  ? "border-[#b3261e] ring-2 ring-[#b3261e]/15"
                  : "border-[#edf2f2] opacity-75 hover:opacity-100"
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
  acceptedOfferIdr?: number | null;
  existingConversationId?: string | null;
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
  acceptedOfferIdr,
  existingConversationId,
}: ItemActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState<string>(
    String(Math.max(BUSINESS.minListingPriceIdr, Math.round((listing.price_idr * 0.9) / 1000) * 1000)),
  );
  const [offerNote, setOfferNote] = useState("");

  const effectivePrice = acceptedOfferIdr ?? listing.price_idr;
  const presets = [
    { label: "-10%", value: Math.round((listing.price_idr * 0.9) / 1000) * 1000 },
    { label: "-15%", value: Math.round((listing.price_idr * 0.85) / 1000) * 1000 },
    { label: "-20%", value: Math.round((listing.price_idr * 0.8) / 1000) * 1000 },
  ].filter((p) => p.value >= BUSINESS.minListingPriceIdr && p.value < listing.price_idr);

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
      if (res.data.paymentUrl.startsWith("/")) {
        router.push(res.data.paymentUrl);
      } else {
        window.location.href = res.data.paymentUrl;
      }
    });
  };

  const handleOpenChat = () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`);
      return;
    }
    if (existingConversationId) {
      router.push(`/messages/${existingConversationId}`);
      return;
    }
    startTransition(async () => {
      const res = await startOrOpenConversationAction(listing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(`/messages/${res.data.conversationId}`);
    });
  };

  const handleOpenOfferModal = () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/items/${listing.id}`)}`);
      return;
    }
    setOfferOpen(true);
  };

  const handleSubmitOffer = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendOfferAction({
        listingId: listing.id,
        conversationId: existingConversationId ?? undefined,
        offerAmountIdr: Number(offerAmount),
        note: offerNote,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setOfferOpen(false);
      router.push(`/messages/${res.data.conversationId}`);
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
    <div className="space-y-3">
      {/* Banner Tawaran Harga yang Sudah Disetujui Penjual */}
      {acceptedOfferIdr && !isOwnListing && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[#bfe3ce] bg-[#e8f5ee] px-3.5 py-2.5 text-xs text-[#146c43]">
          <span className="inline-flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Harga kesepakatan dengan penjual: {formatIDR(acceptedOfferIdr)}
          </span>
          {existingConversationId && (
            <Link
              href={`/messages/${existingConversationId}`}
              className="font-semibold underline hover:no-underline"
            >
              Lihat Chat
            </Link>
          )}
        </div>
      )}

      {/* Rincian Biaya & Alur Perlindungan Transaksi */}
      <div className="rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/70 p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b3261e]" />
          <div className="text-xs leading-relaxed text-[#666666]">
            <p className="font-semibold text-[#171717]">Alur Aman COD & Perlindungan Transaksi</p>
            <p className="mt-0.5">
              Nomor WhatsApp penjual otomatis terbuka setelah pembayaran terkonfirmasi. Dana ditahan
              sementara dan baru diteruskan ke penjual setelah kamu menekan{" "}
              <strong className="font-semibold text-[#171717]">“Barang Diterima”</strong> di titik
              temu.
            </p>
            <p className="tabular-nums mt-1.5 text-[11px] text-[#666666]">
              Total checkout:{" "}
              <strong className="font-semibold text-[#171717]">
                {formatIDR(totalWithGatewayIdr)}
              </strong>{" "}
              (termasuk biaya QRIS {formatIDR(gatewayFeeIdr)}).
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Utama: Beli Sekarang + Tawar Harga + Chat Penjual */}
      {isOwnListing ? (
        <div className="space-y-3 rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#666666]">Ini adalah barang milikmu</span>
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
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" size="md" className="rounded-lg">
                <Link href={`/items/${listing.id}/edit`}>
                  <Edit3 className="h-4 w-4" />
                  Ubah Barang
                </Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="rounded-lg"
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
        <div className="space-y-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full rounded-lg"
            disabled={isPending}
            onClick={handleBuy}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Beli Sekarang • {formatIDR(effectivePrice)}
              </>
            )}
          </Button>

          {/* Tombol Tawar Harga (Make Offer) & Chat Penjual ala Vinted */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="rounded-lg"
              disabled={isPending}
              onClick={handleOpenOfferModal}
            >
              <HandCoins className="h-4 w-4" />
              Tawar Harga
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="rounded-lg"
              disabled={isPending}
              onClick={handleOpenChat}
            >
              <MessageSquare className="h-4 w-4" />
              Chat Penjual
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-[#f8deb0] bg-[#fef6e6] px-4 py-3 text-center text-xs font-semibold text-[#92400e]">
            {listing.status === "reserved"
              ? "Maaf, barang ini sedang dalam proses pembayaran oleh pembeli lain. Silakan cek kembali beberapa saat lagi."
              : "Barang ini sudah terjual."}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full rounded-lg"
            disabled={isPending}
            onClick={handleOpenChat}
          >
            <MessageSquare className="h-4 w-4" />
            Chat Penjual
          </Button>
        </div>
      )}

      {/* Tombol Sekunder: Bagikan ke WhatsApp & Salin Tautan */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          type="button"
          variant="whatsapp"
          size="md"
          className="rounded-lg sm:col-span-2"
          onClick={handleShareWhatsApp}
        >
          <Share2 className="h-4 w-4" />
          Bagikan ke WhatsApp
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="rounded-lg"
          onClick={handleCopyLink}
        >
          <Copy className="h-4 w-4" />
          Salin Link
        </Button>
      </div>

      {/* Tautan Laporkan Barang */}
      {!isOwnListing && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#8c8c8c] transition-colors hover:text-[#b3261e]"
          >
            <Flag className="h-3.5 w-3.5" />
            Laporkan Barang (indikasi palsu / terlarang)
          </button>
        </div>
      )}

      {/* Modal / Bottom Sheet Make Offer (Tawar Harga) */}
      {offerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-2xs sm:items-center sm:p-4">
          <div className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#edf2f2] bg-white p-5 pb-safe shadow-xl sm:rounded-xl sm:pb-5">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d9dfdf] sm:hidden" />
            <div className="flex items-center justify-between border-b border-[#edf2f2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#171717]">Tawar Harga (Make Offer)</h3>
                <p className="text-xs text-[#666666]">
                  Harga asli: <strong className="text-[#171717]">{formatIDR(listing.price_idr)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfferOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-[#8c8c8c] transition hover:bg-[#f2f4f4] hover:text-[#171717]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOffer} className="mt-4 space-y-4">
              {presets.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-[#171717]">
                    Pilihan Diskon Cepat
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {presets.map((p) => {
                      const selected = Number(offerAmount) === p.value;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setOfferAmount(String(p.value))}
                          className={`cursor-pointer rounded-lg border p-2 text-center transition ${
                            selected
                              ? "border-[#b3261e] bg-[#fdf2f2] text-[#b3261e]"
                              : "border-[#d9dfdf] bg-white text-[#171717] hover:bg-[#f2f4f4]"
                          }`}
                        >
                          <span className="block text-xs font-extrabold">{formatIDR(p.value)}</span>
                          <span className="text-[10px] font-medium text-[#8c8c8c]">
                            Hemat {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#171717]">
                  Nominal Tawaranmu (IDR)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  required
                  min={Math.max(BUSINESS.minListingPriceIdr, Math.floor(listing.price_idr * 0.4))}
                  max={listing.price_idr - 500}
                  step={500}
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="tabular-nums font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#171717]">
                  Pesan untuk Penjual (Opsional)
                </label>
                <Input
                  maxLength={200}
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  placeholder="Contoh: Kalau cocok, saya bisa COD siang ini di Lobi kak!"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setOfferOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="rounded-lg"
                  disabled={isPending}
                >
                  {isPending
                    ? "Mengirim..."
                    : `Ajukan Tawaran ${formatIDR(Number(offerAmount) || 0)}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet Laporan Barang (responsif di Android & iOS) */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-2xs sm:items-center sm:p-4">
          <div className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#edf2f2] bg-white p-5 pb-safe shadow-xl sm:rounded-xl sm:pb-5">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d9dfdf] sm:hidden" />
            <div className="flex items-center justify-between border-b border-[#edf2f2] pb-3">
              <h3 className="text-base font-bold text-[#171717]">Laporkan Barang</h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-[#8c8c8c] transition hover:bg-[#f2f4f4] hover:text-[#171717]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#666666]">
              Bantu jaga kepercayaan komunitas kampus dari barang KW/palsu, curian, atau barang
              terlarang.
            </p>

            <form onSubmit={handleSubmitReport} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#171717]">
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
                  className="rounded-lg"
                  onClick={() => setReportOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="rounded-lg"
                  disabled={reportSubmitting}
                >
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
