"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  HandCoins,
  Loader2,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUSINESS } from "@/config/business";
import { formatDateTime, formatIDR } from "@/lib/utils";
import {
  respondToOfferAction,
  sendChatMessageAction,
  sendOfferAction,
} from "@/server/actions/chat";
import { checkoutListingAction } from "@/server/actions/orders";
import type { Listing, Message } from "@/types/database";

interface ChatRoomClientProps {
  conversationId: string;
  currentUserId: string;
  isBuyer: boolean;
  isBuyerVerified: boolean;
  listing: Listing;
  acceptedOfferIdr: number | null;
  messages: Message[];
  counterpartName: string;
}

export function ChatRoomClient({
  conversationId,
  currentUserId,
  isBuyer,
  isBuyerVerified,
  listing,
  acceptedOfferIdr,
  messages,
  counterpartName,
}: ChatRoomClientProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState<string>(
    String(Math.max(BUSINESS.minListingPriceIdr, Math.round((listing.price_idr * 0.9) / 1000) * 1000)),
  );
  const [offerNote, setOfferNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll otomatis ke pesan terbaru saat pesan bertambah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Sinkronisasi berkala setiap 5 detik saat tab aktif
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [router]);

  const effectivePrice = acceptedOfferIdr ?? listing.price_idr;
  const presets = [
    { label: "-10%", value: Math.round((listing.price_idr * 0.9) / 1000) * 1000 },
    { label: "-15%", value: Math.round((listing.price_idr * 0.85) / 1000) * 1000 },
    { label: "-20%", value: Math.round((listing.price_idr * 0.8) / 1000) * 1000 },
  ].filter((p) => p.value >= BUSINESS.minListingPriceIdr && p.value < listing.price_idr);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setText("");
    startTransition(async () => {
      const res = await sendChatMessageAction({ conversationId, body: clean });
      if (!res.ok) {
        toast.error(res.error);
        setText(clean);
        return;
      }
      router.refresh();
    });
  };

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(offerAmount);
    startTransition(async () => {
      const res = await sendOfferAction({
        conversationId,
        offerAmountIdr: amount,
        note: offerNote,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setOfferNote("");
      setOfferOpen(false);
      router.refresh();
    });
  };

  const handleRespondOffer = (messageId: string, decision: "accepted" | "rejected") => {
    startTransition(async () => {
      const res = await respondToOfferAction({ messageId, decision });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  const handleCheckout = () => {
    if (!isBuyerVerified) {
      toast.error("Akunmu harus terverifikasi sebelum dapat membeli barang.");
      router.push("/profile");
      return;
    }
    startTransition(async () => {
      const res = await checkoutListingAction(listing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Mengarahkan ke halaman pembayaran QRIS...");
      if (res.data.paymentUrl.startsWith("/")) {
        router.push(res.data.paymentUrl);
      } else {
        window.location.href = res.data.paymentUrl;
      }
    });
  };

  return (
    <div className="flex flex-col rounded-lg border border-[#edf2f2] bg-white">
      {/* Bar Atas: Info Barang, Status Tawaran, & Tombol Beli / Tawar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f2] bg-[#f2f4f4]/60 p-3.5 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#edf2f2] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.image_urls[0] ?? ""}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-bold text-[#171717] sm:text-sm">
              {listing.title}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {acceptedOfferIdr ? (
                <>
                  <span className="tabular-nums text-xs line-through text-[#8c8c8c]">
                    {formatIDR(listing.price_idr)}
                  </span>
                  <span className="tabular-nums text-sm font-extrabold text-[#146c43]">
                    Deal: {formatIDR(acceptedOfferIdr)}
                  </span>
                </>
              ) : (
                <span className="tabular-nums text-sm font-extrabold text-[#171717]">
                  {formatIDR(listing.price_idr)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Cepat di Header Chat */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {listing.status === "active" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial"
              disabled={isPending}
              onClick={() => setOfferOpen(true)}
            >
              <HandCoins className="h-3.5 w-3.5" />
              {isBuyer ? "Tawar Harga" : "Ajukan Harga Balik"}
            </Button>
          )}

          {isBuyer && listing.status === "active" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-1 sm:flex-initial"
              disabled={isPending}
              onClick={handleCheckout}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Beli • {formatIDR(effectivePrice)}
            </Button>
          )}
        </div>
      </div>

      {/* Daftar Pesan & Kartu Tawaran (Make Offer Cards) */}
      <div className="max-h-[58dvh] min-h-[340px] space-y-3 overflow-y-auto p-3.5 sm:p-4">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 p-6 text-center text-xs text-[#666666]">
            Mulai percakapan dengan <strong className="text-[#171717]">{counterpartName}</strong>{" "}
            atau klik tombol <strong className="text-[#b3261e]">“Tawar Harga”</strong> di atas untuk
            mengajukan penawaran.
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;

          if (msg.message_type === "system") {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe3ce] bg-[#e8f5ee] px-3.5 py-1 text-center text-[11px] font-semibold text-[#146c43]">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  {msg.body}
                </span>
              </div>
            );
          }

          if (msg.message_type === "offer" && msg.offer_amount_idr) {
            const discountPct = Math.max(
              1,
              Math.round(((listing.price_idr - msg.offer_amount_idr) / listing.price_idr) * 100),
            );
            const canRespond = !isMine && msg.offer_status === "pending" && listing.status === "active";

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="w-full max-w-sm rounded-xl border-2 border-[#b3261e]/30 bg-[#fdf2f2]/60 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#b3261e]">
                      <HandCoins className="h-3.5 w-3.5" />
                      {isMine ? "Tawaranmu" : `Tawaran dari ${counterpartName}`}
                    </span>
                    <Badge
                      tone={
                        msg.offer_status === "accepted"
                          ? "success"
                          : msg.offer_status === "rejected"
                            ? "danger"
                            : msg.offer_status === "superseded"
                              ? "neutral"
                              : "warning"
                      }
                    >
                      {msg.offer_status === "accepted"
                        ? "Disetujui ✓"
                        : msg.offer_status === "rejected"
                          ? "Ditolak"
                          : msg.offer_status === "superseded"
                            ? "Digantikan"
                            : "Menunggu Respon"}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="tabular-nums text-xl font-extrabold text-[#171717]">
                      {formatIDR(msg.offer_amount_idr)}
                    </span>
                    <span className="tabular-nums text-xs line-through text-[#8c8c8c]">
                      {formatIDR(listing.price_idr)}
                    </span>
                    <span className="rounded bg-[#b3261e] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Hemat {discountPct}%
                    </span>
                  </div>

                  {msg.body && <p className="text-xs text-[#666666]">“{msg.body}”</p>}

                  {/* Tombol Terima / Tolak / Tawar Balik untuk Penerima Tawaran */}
                  {canRespond && (
                    <div className="grid grid-cols-3 gap-1.5 border-t border-[#edf2f2] pt-2.5">
                      <Button
                        type="button"
                        variant="whatsapp"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRespondOffer(msg.id, "accepted")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Terima
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRespondOffer(msg.id, "rejected")}
                      >
                        <X className="h-3.5 w-3.5" />
                        Tolak
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setOfferOpen(true)}
                      >
                        Tawar Balik
                      </Button>
                    </div>
                  )}

                  {/* Tombol Langsung Checkout ketika Tawaran Disetujui */}
                  {msg.offer_status === "accepted" && isBuyer && listing.status === "active" && (
                    <div className="border-t border-[#edf2f2] pt-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="w-full"
                        disabled={isPending}
                        onClick={handleCheckout}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Checkout Harga Kesepakatan ({formatIDR(msg.offer_amount_idr)})
                      </Button>
                    </div>
                  )}

                  <span className="block text-right text-[10px] text-[#8c8c8c]">
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:max-w-md sm:text-sm ${
                  isMine
                    ? "rounded-br-xs bg-[#b3261e] text-white"
                    : "rounded-bl-xs border border-[#edf2f2] bg-[#f2f4f4] text-[#171717]"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{msg.body}</p>
                <span
                  className={`mt-1 block text-right text-[10px] ${
                    isMine ? "text-white/75" : "text-[#8c8c8c]"
                  }`}
                >
                  {formatDateTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Form Input Chat Bawah */}
      <form
        onSubmit={handleSendText}
        className="flex items-center gap-2 border-t border-[#edf2f2] bg-white p-3"
      >
        {listing.status === "active" && (
          <Button
            type="button"
            variant="outline"
            size="md"
            className="shrink-0 px-3"
            onClick={() => setOfferOpen(true)}
            title="Ajukan Tawaran Harga (Make Offer)"
          >
            <HandCoins className="h-4 w-4" />
            <span className="hidden sm:inline">Tawar</span>
          </Button>
        )}

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={`Tulis pesan ke ${counterpartName}...`}
          className="flex-1"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending || !text.trim()}
          className="shrink-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">Kirim</span>
        </Button>
      </form>

      {/* Modal / Bottom Sheet Make Offer (Tawar Harga) */}
      {offerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-2xs sm:items-center sm:p-4">
          <div className="animate-sheet-up w-full max-w-md rounded-t-2xl border border-[#edf2f2] bg-white p-5 pb-safe shadow-xl sm:rounded-xl sm:pb-5">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#d9dfdf] sm:hidden" />
            <div className="flex items-center justify-between border-b border-[#edf2f2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  {isBuyer ? "Tawar Harga (Make Offer)" : "Ajukan Harga Balik (Counter Offer)"}
                </h3>
                <p className="text-xs text-[#666666]">
                  Harga asli: <strong className="text-[#171717]">{formatIDR(listing.price_idr)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfferOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-[#8c8c8c] hover:bg-[#f2f4f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendOffer} className="mt-4 space-y-4">
              {/* Pilihan Diskon Cepat ala Vinted */}
              {presets.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-xs font-bold text-[#171717]">
                    Pilihan Cepat
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {presets.map((p) => {
                      const selected = Number(offerAmount) === p.value;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setOfferAmount(String(p.value))}
                          className={`rounded-lg border p-2 text-center transition cursor-pointer ${
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
                  Nominal Tawaran (IDR)
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
                  Catatan Singkat (Opsional)
                </label>
                <Input
                  maxLength={200}
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  placeholder="Contoh: Bisa COD hari ini di Lobi Gedung Utama kak!"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOfferOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                  {isPending ? "Mengirim..." : `Kirim Tawaran ${formatIDR(Number(offerAmount) || 0)}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
