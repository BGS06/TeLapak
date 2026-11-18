import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { MockPayClient } from "@/app/pay/mock/[orderId]/mock-pay-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Countdown } from "@/components/ui/countdown";
import { formatIDR, orderCode } from "@/lib/utils";
import { requireProfile } from "@/server/auth";
import { getOrderDetail } from "@/server/queries";

export const metadata: Metadata = {
  title: "Pembayaran QRIS & E-Wallet",
};

export default async function MockPayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  await requireProfile(`/pay/mock/${orderId}`);
  const bundle = await getOrderDetail(orderId);
  if (!bundle) notFound();

  const { order, listing, seller } = bundle;
  if (order.status !== "pending_payment") {
    redirect(`/orders/${order.id}`);
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-6">
        <div className="mb-4">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57524c] hover:text-[#181512]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Lihat Detail Pesanan #{orderCode(order.id)}
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e6e0d6] bg-white p-6 shadow-xs space-y-5">
          {/* Header Invoice */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e0d6] pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-[#857e76]">
                INVOICE #{orderCode(order.id)}
              </span>
              <h1 className="text-lg font-extrabold text-[#181512]">
                Checkout Perlindungan Transaksi
              </h1>
            </div>
            <div className="rounded-xl border border-[#f8deb0] bg-[#fef6e6] px-3 py-1.5 text-right text-xs text-[#92400e]">
              <span className="block text-[10px] font-medium">Sisa Waktu Bayar</span>
              <Countdown targetIso={order.expires_at} />
            </div>
          </div>

          {/* Ringkasan Barang & Rincian Biaya */}
          <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#e6e0d6] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.image_urls[0] ?? ""}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#181512]">{listing.title}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#57524c]">
                  <MapPin className="h-3 w-3 text-[#b3261e]" />
                  {listing.meeting_point} • Penjual: <strong>{seller?.first_name ?? "Civitas"}</strong>
                </p>
              </div>
            </div>

            <dl className="space-y-1.5 border-t border-[#e6e0d6] pt-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#57524c]">Harga Barang</dt>
                <dd className="tabular-nums font-semibold text-[#181512]">
                  {formatIDR(order.item_price_idr)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#57524c]">Biaya Layanan QRIS (0,7%)</dt>
                <dd className="tabular-nums font-semibold text-[#181512]">
                  {formatIDR(order.gateway_fee_idr)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[#e6e0d6] pt-2 text-sm">
                <dt className="font-bold text-[#181512]">Total Pembayaran</dt>
                <dd className="tabular-nums font-extrabold text-[#b3261e]">
                  {formatIDR(order.total_paid_idr)}
                </dd>
              </div>
            </dl>
          </div>

          <MockPayClient
            orderId={order.id}
            listingId={listing.id}
            amountIdr={order.total_paid_idr}
          />

          <div className="flex items-start gap-2 rounded-xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-3 text-xs text-[#146c43]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Dana Ditahan Sementara:</strong> begitu pembayaran dikonfirmasi, nomor
              WhatsApp penjual langsung dibuka di halaman pesanan untuk janjian di{" "}
              <strong>{listing.meeting_point}</strong>.
            </span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
