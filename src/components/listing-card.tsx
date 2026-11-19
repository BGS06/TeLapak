import Link from "next/link";
import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { calculateFees } from "@/config/business";
import { categoryLabel, conditionOf } from "@/config/constants";
import { formatIDR } from "@/lib/utils";
import type { Listing } from "@/types/database";

/**
 * Kartu Barang Katalog Gaya Vinted (Borderless, Rasio 3:4, Dual-Price, Merah Telkom)
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const condition = conditionOf(listing.condition);
  const fees = calculateFees(listing.price_idr);
  const cover = listing.image_urls[0] ?? "";

  return (
    <Link href={`/items/${listing.id}`} className="group flex flex-col">
      {/* Foto Rasio 3:4 Tanpa Bingkai Luar */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#f2f4f4]">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8c8c8c]">
              Belum ada foto
            </span>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#171717]">
              {listing.title}
            </p>
          </div>
        )}

        {/* Label Kategori Ringkas di Pojok Kiri Bawah */}
        <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[#171717] shadow-2xs backdrop-blur-xs">
          {categoryLabel(listing.category)}
        </span>

        {/* Ikon Favorit di Pojok Kanan Bawah */}
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#666666] shadow-xs backdrop-blur-xs transition-colors group-hover:text-[#b3261e]"
        >
          <Heart className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Metadata Produk Khas Vinted */}
      <div className="flex flex-col pt-2">
        {/* Baris 1: Harga Dasar Penjual */}
        <p className="tabular-nums text-xs font-medium text-[#666666]">
          {formatIDR(listing.price_idr)}
        </p>

        {/* Baris 2: Harga Termasuk Perlindungan Transaksi + Ikon Perisai Merah */}
        <div className="flex items-center gap-1">
          <p className="tabular-nums text-sm font-extrabold tracking-tight text-[#b3261e] sm:text-[15px]">
            {formatIDR(fees.totalPaid)}
          </p>
          <span
            title="Termasuk Perlindungan Transaksi LapakTelu"
            className="inline-flex items-center text-[#b3261e]"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>

        {/* Judul Barang */}
        <h3 className="mt-1 line-clamp-1 text-xs font-semibold text-[#171717] transition-colors group-hover:text-[#b3261e]">
          {listing.title}
        </h3>

        {/* Kondisi & Titik COD */}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8c8c8c]">
          {condition && (
            <>
              <span className="shrink-0 text-[#666666]">
                {condition.label ?? condition.badge}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <MapPin className="h-3 w-3 shrink-0 text-[#b3261e]" />
            <span className="truncate">{listing.meeting_point}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}