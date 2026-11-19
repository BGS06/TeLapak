"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogSort } from "@/server/queries";

interface CatalogFiltersBarProps {
  q?: string;
  category?: string;
  condition?: string;
  meetingPoint?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: CatalogSort;
  meetingPoints: string[];
}

export function CatalogFiltersBar({
  q,
  category,
  condition,
  meetingPoint,
  minPrice,
  maxPrice,
  sort = "newest",
  meetingPoints,
}: CatalogFiltersBarProps) {
  const router = useRouter();
  const [priceOpen, setPriceOpen] = useState(Boolean(minPrice || maxPrice));
  const [minVal, setMinVal] = useState(minPrice ?? "");
  const [maxVal, setMaxVal] = useState(maxPrice ?? "");

  const navigateWith = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      q,
      category,
      condition,
      meetingPoint,
      minPrice,
      maxPrice,
      sort: sort === "newest" ? undefined : sort,
      ...patch,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v.trim()) sp.set(k, v.trim());
    }
    const qs = sp.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMin = minVal.replace(/[^0-9]/g, "");
    const cleanMax = maxVal.replace(/[^0-9]/g, "");
    navigateWith({
      minPrice: cleanMin || undefined,
      maxPrice: cleanMax || undefined,
    });
  };

  const handleClearPrice = () => {
    setMinVal("");
    setMaxVal("");
    setPriceOpen(false);
    navigateWith({ minPrice: undefined, maxPrice: undefined });
  };

  const hasPrice = Boolean(minPrice || maxPrice);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Titik Temu COD */}
        <label className="inline-flex items-center gap-1.5 rounded-md border border-[#d9dfdf] bg-white px-2.5 py-1.5 text-xs text-[#666666] focus-within:border-[#b3261e]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#b3261e]" />
          <span className="sr-only">Filter titik temu COD</span>
          <select
            value={meetingPoint ?? ""}
            onChange={(e) => navigateWith({ meetingPoint: e.target.value || undefined })}
            className="cursor-pointer bg-transparent text-base font-medium text-[#171717] focus:outline-none sm:text-xs"
          >
            <option value="">Semua Titik COD</option>
            {meetingPoints.map((mp) => (
              <option key={mp} value={mp}>
                {mp}
              </option>
            ))}
          </select>
        </label>

        {/* Tombol Toggle Rentang Harga */}
        <button
          type="button"
          onClick={() => setPriceOpen((prev) => !prev)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
            hasPrice || priceOpen
              ? "border-[#b3261e] bg-[#fdf2f2] font-semibold text-[#b3261e]"
              : "border-[#d9dfdf] bg-white text-[#666666] hover:bg-[#f2f4f4]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>
            {hasPrice
              ? `Rp ${minPrice ? Number(minPrice).toLocaleString("id-ID") : "0"} – ${
                  maxPrice ? Number(maxPrice).toLocaleString("id-ID") : "∞"
                }`
              : "Rentang Harga"}
          </span>
        </button>

        {/* Dropdown Urutkan */}
        <label className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[#d9dfdf] bg-white px-2.5 py-1.5 text-xs text-[#666666] focus-within:border-[#b3261e]">
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#8c8c8c]" />
          <span className="sr-only">Urutkan barang</span>
          <select
            value={sort}
            onChange={(e) =>
              navigateWith({
                sort: e.target.value === "newest" ? undefined : e.target.value,
              })
            }
            className="cursor-pointer bg-transparent text-base font-medium text-[#171717] focus:outline-none sm:text-xs"
          >
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga Termurah</option>
            <option value="price_desc">Harga Termahal</option>
          </select>
        </label>
      </div>

      {/* Panel Input Rentang Harga (Min - Maks Rp) */}
      {priceOpen && (
        <form
          onSubmit={handlePriceApply}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/60 p-3"
        >
          <span className="text-xs font-semibold text-[#171717]">Harga (Rp):</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={5000}
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
            placeholder="Min (mis. 20000)"
            className="h-9 w-36 rounded-md border border-[#d9dfdf] bg-white px-2.5 text-base text-[#171717] placeholder:text-[#8c8c8c] focus:border-[#b3261e] focus:outline-none sm:h-8 sm:text-xs"
          />
          <span className="text-xs text-[#8c8c8c]">—</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={5000}
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
            placeholder="Maks (mis. 200000)"
            className="h-9 w-36 rounded-md border border-[#d9dfdf] bg-white px-2.5 text-base text-[#171717] placeholder:text-[#8c8c8c] focus:border-[#b3261e] focus:outline-none sm:h-8 sm:text-xs"
          />
          <Button type="submit" variant="primary" size="sm" className="h-8 px-3 text-xs">
            Terapkan
          </Button>
          {hasPrice && (
            <button
              type="button"
              onClick={handleClearPrice}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#666666] hover:text-[#b3261e]"
            >
              <X className="h-3.5 w-3.5" />
              Hapus
            </button>
          )}
        </form>
      )}
    </div>
  );
}
