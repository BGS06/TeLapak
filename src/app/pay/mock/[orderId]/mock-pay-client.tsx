"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, QrCode, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatIDR, orderCode } from "@/lib/utils";
import { cancelOrderAction, completeMockPaymentAction } from "@/server/actions/orders";

const PAYMENT_CHANNELS = [
  { id: "qris", label: "QRIS", subtitle: "Semua M-Banking & E-Wallet" },
  { id: "gopay", label: "GoPay", subtitle: "Bayar instan via GoPay" },
  { id: "dana", label: "DANA", subtitle: "Saldo DANA" },
  { id: "shopeepay", label: "ShopeePay", subtitle: "Saldo ShopeePay" },
  { id: "ovo", label: "OVO", subtitle: "Push notifikasi OVO" },
] as const;

export function MockPayClient({
  orderId,
  listingId,
  amountIdr,
}: {
  orderId: string;
  listingId: string;
  amountIdr: number;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<(typeof PAYMENT_CHANNELS)[number]["id"]>("qris");
  const [isPending, startTransition] = useTransition();

  const handleSimulatePaid = () => {
    startTransition(async () => {
      const res = await completeMockPaymentAction(orderId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/orders/${orderId}`);
      router.refresh();
    });
  };

  const handleCancelOrder = () => {
    startTransition(async () => {
      const res = await cancelOrderAction(orderId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/items/${listingId}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Pilihan Metode Pembayaran (PRD §5: utamakan QRIS & e-wallet) */}
      <div>
        <span className="mb-1.5 block text-xs font-bold text-[#181512]">
          Pilih Metode Pembayaran
        </span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PAYMENT_CHANNELS.map((ch) => {
            const active = channel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannel(ch.id)}
                className={`flex flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center transition-colors cursor-pointer ${
                  active
                    ? "border-[#b3261e] bg-[#fdeceb] text-[#b3261e]"
                    : "border-[#e6e0d6] bg-white text-[#57524c] hover:bg-[#f3efe9]"
                }`}
              >
                <span className="text-xs font-extrabold">{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kotak Visual QRIS / E-Wallet */}
      <div className="rounded-2xl border border-[#e6e0d6] bg-[#faf8f5] p-5 text-center space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#57524c]">
          <span>TELAPAK • TEL-U SURABAYA</span>
          <span className="font-mono">NMID: ID20261119{orderCode(orderId)}</span>
        </div>

        <div className="mx-auto flex h-52 w-52 flex-col items-center justify-center rounded-2xl border-2 border-[#181512] bg-white p-4 shadow-xs">
          {channel === "qris" ? (
            <>
              <QrCode className="h-32 w-32 text-[#181512]" />
              <span className="mt-2 rounded bg-[#181512] px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">
                QRIS STANDAR NASIONAL
              </span>
            </>
          ) : (
            <>
              <Smartphone className="h-20 w-20 text-[#b3261e]" />
              <span className="mt-2 text-xs font-extrabold uppercase text-[#181512]">
                {channel} Instant Checkout
              </span>
              <span className="mt-0.5 text-[11px] text-[#57524c]">
                Klik tombol bayar di bawah untuk otorisasi
              </span>
            </>
          )}
        </div>

        <p className="text-xs text-[#57524c]">
          Nominal akan ditahan sementara di rekening platform hingga kamu menerima barang di titik
          temu kampus.
        </p>
      </div>

      <div className="space-y-2.5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={handleSimulatePaid}
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Memverifikasi Pembayaran...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Bayar Sekarang & Konfirmasi ({formatIDR(amountIdr)})
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          disabled={isPending}
          onClick={handleCancelOrder}
        >
          <XCircle className="h-4 w-4" />
          Batalkan Pesanan & Lepas Reservasi Barang
        </Button>
      </div>
    </div>
  );
}
