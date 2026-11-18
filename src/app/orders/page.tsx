import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Package, ShoppingBag, Store } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, formatIDR, orderCode } from "@/lib/utils";
import { requireProfile } from "@/server/auth";
import { getMyOrders, type OrderWithListing } from "@/server/queries";

export const metadata: Metadata = {
  title: "Riwayat Pesanan",
};

function OrderRowCard({
  item,
  perspective,
}: {
  item: OrderWithListing;
  perspective: "buyer" | "seller";
}) {
  const { order, listing, counterpart } = item;
  const statusMeta = ORDER_STATUS[order.status];
  const amount = perspective === "buyer" ? order.total_paid_idr : order.seller_net_idr;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex flex-col justify-between gap-3 rounded-2xl border border-[#e6e0d6] bg-white p-4 transition-all hover:border-[#cfc6b8] hover:shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3.5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e6e0d6] bg-[#f3efe9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.image_urls[0] ?? ""}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#857e76]">
              {orderCode(order.id)}
            </span>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
          <h3 className="mt-1 line-clamp-1 text-sm font-bold text-[#181512] group-hover:text-[#b3261e]">
            {listing.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#57524c]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[#b3261e]" />
              {listing.meeting_point}
            </span>
            {counterpart && (
              <span>
                {perspective === "buyer" ? "Penjual" : "Pembeli"}:{" "}
                <strong className="text-[#181512]">{counterpart.first_name}</strong>
              </span>
            )}
            <span className="text-[#857e76]">{formatDateTime(order.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#f3efe9] pt-2.5 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <div className="text-left sm:text-right">
          <span className="block text-[11px] text-[#857e76]">
            {perspective === "buyer" ? "Total Bayar" : "Saldo Bersih"}
          </span>
          <span className="tabular-nums text-base font-extrabold text-[#181512]">
            {formatIDR(amount)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#b3261e]">
          Detail
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-xl flex-1 px-4 py-12">
          <div className="rounded-2xl border border-[#f8deb0] bg-[#fef6e6] p-6 text-xs text-[#92400e]">
            Hubungkan Supabase di <code className="rounded bg-[#fbe9c6] px-1 py-0.5">.env.local</code>{" "}
            untuk melihat riwayat pembelian dan penjualan.
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const [params, profile] = await Promise.all([searchParams, requireProfile("/orders")]);
  const { purchases, sales } = await getMyOrders(profile.id);
  const activeTab = params.tab === "penjualan" ? "penjualan" : "pembelian";
  const list = activeTab === "penjualan" ? sales : purchases;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#181512] sm:text-2xl">
              Riwayat Pesanan
            </h1>
            <p className="mt-1 text-xs text-[#57524c]">
              Pantau status dana ditahan sementara, kontak WhatsApp titik temu, dan konfirmasi
              serah terima.
            </p>
          </div>

          {/* Tab Pembelian & Penjualan (PRD §7.4) */}
          <div className="inline-flex rounded-xl border border-[#e6e0d6] bg-white p-1">
            <Link
              href="/orders?tab=pembelian"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "pembelian"
                  ? "bg-[#181512] text-white"
                  : "text-[#57524c] hover:text-[#181512]"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Pembelian ({purchases.length})
            </Link>
            <Link
              href="/orders?tab=penjualan"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "penjualan"
                  ? "bg-[#181512] text-white"
                  : "text-[#57524c] hover:text-[#181512]"
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Penjualan ({sales.length})
            </Link>
          </div>
        </div>

        {list.length > 0 ? (
          <div className="mt-5 space-y-3">
            {list.map((item) => (
              <OrderRowCard
                key={item.order.id}
                item={item}
                perspective={activeTab === "penjualan" ? "seller" : "buyer"}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dcd5c9] bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3efe9] text-[#857e76]">
              <Package className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-bold text-[#181512]">
              {activeTab === "pembelian"
                ? "Belum ada riwayat pembelian"
                : "Belum ada riwayat penjualan"}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-[#57524c]">
              {activeTab === "pembelian"
                ? "Cari barang bekas layak pakai di katalog kampusmu dan nikmati perlindungan transaksi."
                : "Pasang barang bekasmu dalam hitungan menit tanpa perlu membuat toko."}
            </p>
            <Button asChild variant="primary" size="sm" className="mt-5">
              <Link href={activeTab === "pembelian" ? "/" : "/sell"}>
                {activeTab === "pembelian" ? "Jelajahi Katalog" : "Pasang Barang Sekarang"}
              </Link>
            </Button>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
