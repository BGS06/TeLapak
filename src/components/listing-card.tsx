import Link from "next/link";
import { MapPin } from "lucide-react";
import { conditionOf } from "@/config/constants";
import { formatIDR } from "@/lib/utils";
import type { Listing } from "@/types/database";

/**
 * Kartu Barang Katalog (PRD §7.1):
 * Foto rasio 1:1, harga (Rp 85.000), judul singkat (maks. 2 baris),
 * badge kondisi (Seperti baru ✓ / Bekas baik ✓), dan nama titik temu.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const condition = conditionOf(listing.condition);
  const cover = listing.image_urls[0] ?? "";

  return (
    <Link
      href={`/items/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#e6e0d6] bg-white transition-all hover:-translate-y-0.5 hover:border-[#cfc6b8] hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#f3efe9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {condition && (
          <span
            className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs backdrop-blur-xs ${
              listing.condition === "like_new"
                ? "bg-[#e8f5ee]/95 text-[#146c43] border border-[#bfe3ce]"
                : listing.condition === "good"
                  ? "bg-white/95 text-[#181512] border border-[#e6e0d6]"
                  : "bg-[#fef6e6]/95 text-[#92400e] border border-[#f8deb0]"
            }`}
          >
            {condition.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5">
        <div>
          <p className="tabular-nums text-base font-extrabold tracking-tight text-[#181512] sm:text-lg">
            {formatIDR(listing.price_idr)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-[#3d3833] group-hover:text-[#b3261e] sm:text-sm">
            {listing.title}
          </h3>
        </div>

        <div className="mt-2.5 flex items-center gap-1 border-t border-[#f3efe9] pt-2 text-[11px] font-medium text-[#6e675f]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#b3261e]" />
          <span className="truncate">{listing.meeting_point}</span>
        </div>
      </div>
    </Link>
  );
}
