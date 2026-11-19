import Link from "next/link";
import { PackageOpen, Plus, ShieldCheck, X } from "lucide-react";
import { CatalogFiltersBar } from "@/components/catalog-filters-bar";
import { HeroCarousel } from "@/components/hero-carousel";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CONDITIONS, categoryLabel } from "@/config/constants";
import {
  getActiveCampusForSession,
  getCatalogListings,
  type CatalogSort,
} from "@/server/queries";
import type { Enums } from "@/types/database";

interface HomeSearchParams {
  q?: string;
  category?: string;
  condition?: string;
  meetingPoint?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

function buildFilterHref(current: HomeSearchParams, patch: Partial<HomeSearchParams>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.q?.trim()) params.set("q", next.q.trim());
  if (next.category) params.set("category", next.category);
  if (next.condition) params.set("condition", next.condition);
  if (next.meetingPoint) params.set("meetingPoint", next.meetingPoint);
  if (next.minPrice) params.set("minPrice", next.minPrice);
  if (next.maxPrice) params.set("maxPrice", next.maxPrice);
  if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const activeCategory = CATEGORIES.find((c) => c.value === params.category)?.value as
    | Enums<"listing_category">
    | undefined;
  const activeCondition = CONDITIONS.find((c) => c.value === params.condition)?.value as
    | Enums<"listing_condition">
    | undefined;
  const q = params.q?.trim() ?? "";
  const sort: CatalogSort =
    params.sort === "price_asc" || params.sort === "price_desc" ? params.sort : "newest";
  const minPriceNum = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPriceNum = params.maxPrice ? Number(params.maxPrice) : undefined;
  const minPrice =
    typeof minPriceNum === "number" && Number.isFinite(minPriceNum) && minPriceNum > 0
      ? minPriceNum
      : undefined;
  const maxPrice =
    typeof maxPriceNum === "number" && Number.isFinite(maxPriceNum) && maxPriceNum > 0
      ? maxPriceNum
      : undefined;

  const campus = await getActiveCampusForSession();
  const activeMeetingPoint = campus.meeting_points.includes(params.meetingPoint ?? "")
    ? params.meetingPoint
    : undefined;

  const listings = await getCatalogListings({
    campusId: campus.id,
    q,
    category: activeCategory,
    condition: activeCondition,
    meetingPoint: activeMeetingPoint,
    minPrice,
    maxPrice,
    sort,
  });

  const hasFilter = Boolean(
    q ||
      activeCategory ||
      activeCondition ||
      activeMeetingPoint ||
      minPrice ||
      maxPrice ||
      sort !== "newest",
  );

  const catalogHeading = q
    ? `Hasil pencarian “${q}”`
    : activeCategory
      ? categoryLabel(activeCategory)
      : `Baru Diunggah di ${campus.name}`;

  return (
    <>
      <SiteHeader initialQuery={q} activeCategory={activeCategory} />

      {/* Hero Carousel Multi-Gambar dengan Bullet & Tombol Panah */}
      {!hasFilter && <HeroCarousel campusName={campus.name} />}

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-5 pb-12">
        {/* Toolbar Filter Kondisi, Harga, Titik COD, & Sortir */}
        <section aria-label="Filter barang" className="space-y-3 border-b border-[#edf2f2] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              <span className="mr-1 shrink-0 text-xs font-medium text-[#8c8c8c]">Kondisi:</span>
              <Link
                href={buildFilterHref(params, { condition: undefined })}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  !activeCondition
                    ? "border-[#b3261e] bg-[#fdf2f2] font-semibold text-[#b3261e]"
                    : "border-[#d9dfdf] bg-white text-[#666666] hover:bg-[#f2f4f4]"
                }`}
              >
                Semua
              </Link>
              {CONDITIONS.map((cond) => {
                const selected = activeCondition === cond.value;
                return (
                  <Link
                    key={cond.value}
                    href={buildFilterHref(params, {
                      condition: selected ? undefined : cond.value,
                    })}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-[#b3261e] bg-[#b3261e] font-semibold text-white"
                        : "border-[#d9dfdf] bg-white text-[#666666] hover:bg-[#f2f4f4]"
                    }`}
                  >
                    {cond.label}
                  </Link>
                );
              })}
            </div>

            <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-[#f2f4f4] px-3 py-1.5 text-xs font-medium text-[#171717] sm:self-auto">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#b3261e]" />
              Perlindungan Transaksi Aktif
            </span>
          </div>

          <CatalogFiltersBar
            q={q || undefined}
            category={activeCategory}
            condition={activeCondition}
            meetingPoint={activeMeetingPoint}
            minPrice={minPrice ? String(minPrice) : undefined}
            maxPrice={maxPrice ? String(maxPrice) : undefined}
            sort={sort}
            meetingPoints={campus.meeting_points}
          />
        </section>

        {/* Judul Katalog & Jumlah Barang */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-[#171717] sm:text-lg">
              {catalogHeading}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#666666]">
              <span>
                Menampilkan <strong className="font-semibold text-[#171717]">{listings.length}</strong>{" "}
                barang siap COD
              </span>
              {hasFilter && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 rounded-md bg-[#fdf2f2] px-2 py-0.5 font-semibold text-[#b3261e] hover:bg-[#fbe6e5]"
                >
                  <X className="h-3 w-3" />
                  Reset filter
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Grid Kartu Barang 5 Kolom ala Vinted */}
        {listings.length > 0 ? (
          <section
            aria-label="Daftar barang"
            className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </section>
        ) : (
          <section className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8c8c8c] shadow-2xs">
              <PackageOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#171717]">
              Belum ada barang yang cocok
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#666666]">
              {hasFilter
                ? "Coba kata kunci lain atau hapus filter kategori/kondisi untuk melihat semua barang di kampusmu."
                : "Jadilah yang pertama memasang barang bekas layak pakai untuk civitas kampusmu."}
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {hasFilter && (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/">Lihat Semua Barang</Link>
                </Button>
              )}
              <Button asChild variant="primary" size="sm">
                <Link href="/sell">
                  <Plus className="h-4 w-4" />
                  Pasang Barang
                </Link>
              </Button>
            </div>
          </section>
        )}
      </main>

      <div id="cara-kerja">
        <SiteFooter />
      </div>
    </>
  );
}