import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  DisputeEvidenceUploader,
  PaidHeldActions,
  PendingPaymentActions,
} from "@/app/orders/[id]/order-actions-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { ORDER_STATUS, PAYOUT_STATUS } from "@/config/constants";
import { formatDateTime, formatIDR, formatWhatsApp, orderCode } from "@/lib/utils";
import { requireProfile } from "@/server/auth";
import { getOrderDetail } from "@/server/queries";
import type { Enums } from "@/types/database";

export const metadata: Metadata = {
  title: "Detail Pesanan",
};

function OrderProgressStepper({
  status,
  meetingPoint,
}: {
  status: Enums<"order_status">;
  meetingPoint: string;
}) {
  if (status === "cancelled" || status === "expired") {
    return null;
  }

  const currentStep =
    status === "pending_payment"
      ? 1
      : status === "paid_held"
        ? 2
        : status === "disputed"
          ? 3
          : 4;

  const steps = [
    { step: 1, title: "1. Checkout", desc: "Barang dikunci 1 jam" },
    { step: 2, title: "2. Dana Ditahan", desc: "WA penjual terbuka" },
    { step: 3, title: "3. COD Kampus", desc: meetingPoint },
    {
      step: 4,
      title: status === "refunded" ? "4. Dana Dikembalikan" : "4. Transaksi Selesai",
      desc: status === "refunded" ? "Refund ke pembeli" : "Saldo siap dicairkan",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
      {steps.map((s) => {
        const done = currentStep > s.step || (currentStep === 4 && s.step === 4);
        const active = currentStep === s.step && currentStep < 4;
        return (
          <div
            key={s.step}
            className={`rounded-xl border p-2.5 text-xs ${
              done
                ? "border-[#bfe3ce] bg-[#e8f5ee]/60 text-[#146c43]"
                : active
                  ? "border-[#b3261e] bg-[#fdeceb]/50 text-[#181512]"
                  : "border-[#e6e0d6] bg-[#faf8f5] text-[#857e76]"
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>{s.title}</span>
              {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#146c43]" />}
            </div>
            <p className="mt-0.5 truncate text-[11px] opacity-85">{s.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, bundle] = await Promise.all([
    requireProfile(`/orders/${id}`),
    getOrderDetail(id),
  ]);

  if (!bundle) notFound();
  const { order, listing, buyer, seller, sellerContact, dispute, payoutEntry } = bundle;

  const isBuyer = order.buyer_id === profile.id;
  const isSeller = order.seller_id === profile.id;
  if (!isBuyer && !isSeller && profile.role !== "admin") notFound();

  const statusMeta = ORDER_STATUS[order.status];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 space-y-5">
        <div>
          <Link
            href={isSeller ? "/orders?tab=penjualan" : "/orders?tab=pembelian"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57524c] hover:text-[#181512]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Riwayat Pesanan
          </Link>
        </div>

        {/* Kartu Status Utama & Stepper Alur Transaksi */}
        <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-[#857e76]">
                Pesanan #{orderCode(order.id)}
              </span>
              <h1 className="mt-0.5 text-lg font-extrabold tracking-tight text-[#181512] sm:text-xl">
                {statusMeta.label}
              </h1>
            </div>
            <Badge tone={statusMeta.tone} className="text-xs px-3 py-1">
              {statusMeta.label}
            </Badge>
          </div>

          <p className="text-xs leading-relaxed text-[#57524c]">{statusMeta.hint}</p>

          <OrderProgressStepper status={order.status} meetingPoint={listing.meeting_point} />

          {/* Hitung mundur 1 jam untuk pending_payment */}
          {order.status === "pending_payment" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f8deb0] bg-[#fef6e6] px-4 py-3 text-xs text-[#92400e]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4" />
                Batas waktu pembayaran (barang ditahan untukmu):
              </span>
              <Countdown targetIso={order.expires_at} expiredText="Kedaluwarsa" />
            </div>
          )}

          {/* Hitung mundur auto-release 72 jam untuk paid_held (PRD §5 & §7.4) */}
          {order.status === "paid_held" && order.auto_release_at && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#c7d9fe] bg-[#eef4ff] px-4 py-3 text-xs text-[#1e40af]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Dana otomatis diteruskan ke penjual dalam:
              </span>
              <Countdown targetIso={order.auto_release_at} expiredText="Siap diteruskan" />
            </div>
          )}

          {/* Aksi sesuai status */}
          {order.status === "pending_payment" && (
            <PendingPaymentActions
              orderId={order.id}
              paymentUrl={order.payment_url}
              isBuyer={isBuyer}
            />
          )}

          {order.status === "paid_held" && (
            <PaidHeldActions
              orderId={order.id}
              userId={profile.id}
              isBuyer={isBuyer}
              itemTitle={listing.title}
              meetingPoint={listing.meeting_point}
              sellerWhatsapp={sellerContact?.whatsapp_number ?? null}
              sellerName={seller?.first_name ?? "Penjual"}
            />
          )}

          {/* Informasi Pencairan setelah Transaksi Selesai */}
          {order.status === "completed" && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5 text-xs text-[#181512]">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#146c43]" />
                <div>
                  <p className="font-bold text-[#146c43]">
                    Transaksi Selesai • Saldo Penjual:{" "}
                    {payoutEntry ? PAYOUT_STATUS[payoutEntry.status].label : "Siap Dicairkan"}
                  </p>
                  <p className="mt-0.5 text-[#3d3833]">
                    Saldo bersih <strong>{formatIDR(order.seller_net_idr)}</strong> tercatat di buku
                    besar pencairan (<code>payout_ledger</code>).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSeller && (
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/profile">
                      Buku Besar Saldo
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                {profile.role === "admin" && (
                  <Button asChild variant="primary" size="sm">
                    <Link href="/admin?tab=payout">
                      Kelola Payout
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Kotak Informasi Titik Temu & Kontak Penjual (PRD §7.4) */}
        {(order.status === "paid_held" ||
          order.status === "disputed" ||
          order.status === "completed") && (
          <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#857e76]">
              Informasi Titik Temu Kampus & Kontak
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b3261e]" />
                  <div className="text-xs">
                    <p className="font-bold text-[#181512]">{listing.meeting_point}</p>
                    {listing.meeting_point_note && (
                      <p className="mt-0.5 text-[#57524c]">“{listing.meeting_point_note}”</p>
                    )}
                  </div>
                </div>
              </div>

              {(isBuyer || profile.role === "admin") && sellerContact?.whatsapp_number && (
                <div className="rounded-xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#146c43]" />
                    <div className="text-xs">
                      <p className="font-bold text-[#181512]">
                        WhatsApp Penjual: {sellerContact.full_name}
                      </p>
                      <p className="mt-0.5 font-mono font-semibold text-[#146c43]">
                        {formatWhatsApp(sellerContact.whatsapp_number)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Kotak Sengketa (jika disputed atau pernah ada sengketa) */}
        {dispute && (
          <section className="rounded-2xl border border-[#fecaca] bg-[#fef2f2]/60 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#991b1b]" />
                <h2 className="text-sm font-bold text-[#991b1b]">Detail Laporan Masalah</h2>
              </div>
              {profile.role === "admin" && order.status === "disputed" && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/admin?tab=sengketa">Putus Sengketa di Panel Admin</Link>
                </Button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-[#181512] whitespace-pre-line">
              {dispute.reason}
            </p>

            {dispute.signedEvidenceUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {dispute.signedEvidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square overflow-hidden rounded-xl border border-[#fecaca] bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Bukti sengketa ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}

            {dispute.admin_notes && (
              <div className="rounded-xl border border-[#e6e0d6] bg-white p-3 text-xs">
                <p className="font-bold text-[#181512]">Catatan Putusan Admin:</p>
                <p className="mt-0.5 text-[#57524c]">{dispute.admin_notes}</p>
              </div>
            )}

            {order.status === "disputed" && (isBuyer || isSeller) && (
              <div className="pt-1">
                <DisputeEvidenceUploader orderId={order.id} userId={profile.id} />
              </div>
            )}
          </section>
        )}

        {/* Ringkasan Barang & Rincian Nominal */}
        <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#857e76]">
            Ringkasan Transaksi
          </h2>

          <Link
            href={`/items/${listing.id}`}
            className="flex items-center gap-3.5 rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3 hover:border-[#cfc6b8]"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e6e0d6] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.image_urls[0] ?? ""}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#181512]">{listing.title}</p>
              <p className="mt-0.5 text-xs text-[#57524c]">
                Penjual: <strong>{seller?.first_name ?? "-"}</strong> • Pembeli:{" "}
                <strong>{buyer?.first_name ?? "-"}</strong>
              </p>
            </div>
          </Link>

          <dl className="space-y-2 border-t border-[#e6e0d6] pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-[#57524c]">Harga Barang</dt>
              <dd className="tabular-nums font-semibold text-[#181512]">
                {formatIDR(order.item_price_idr)}
              </dd>
            </div>

            {isBuyer && (
              <>
                <div className="flex justify-between">
                  <dt className="text-[#57524c]">Biaya Layanan Pembayaran (QRIS)</dt>
                  <dd className="tabular-nums font-semibold text-[#181512]">
                    {formatIDR(order.gateway_fee_idr)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-[#f3efe9] pt-2 text-sm">
                  <dt className="font-bold text-[#181512]">Total Dibayar Pembeli</dt>
                  <dd className="tabular-nums font-extrabold text-[#b3261e]">
                    {formatIDR(order.total_paid_idr)}
                  </dd>
                </div>
              </>
            )}

            {isSeller && (
              <>
                <div className="flex justify-between">
                  <dt className="text-[#57524c]">Komisi Platform</dt>
                  <dd className="tabular-nums font-semibold text-[#991b1b]">
                    - {formatIDR(order.platform_fee_idr)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-[#f3efe9] pt-2 text-sm">
                  <dt className="font-bold text-[#181512]">Saldo Bersih Penjual</dt>
                  <dd className="tabular-nums font-extrabold text-[#146c43]">
                    {formatIDR(order.seller_net_idr)}
                  </dd>
                </div>
                {payoutEntry && (
                  <div className="flex items-center justify-between pt-1">
                    <dt className="text-[#57524c]">Status Buku Besar Pencairan</dt>
                    <dd>
                      <Badge tone={PAYOUT_STATUS[payoutEntry.status].tone}>
                        {PAYOUT_STATUS[payoutEntry.status].label}
                      </Badge>
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>

          <div className="border-t border-[#f3efe9] pt-3 text-[11px] text-[#857e76] space-y-0.5">
            <p>Dibuat: {formatDateTime(order.created_at)}</p>
            {order.paid_at && <p>Dibayar: {formatDateTime(order.paid_at)}</p>}
            {order.completed_at && <p>Selesai: {formatDateTime(order.completed_at)}</p>}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
