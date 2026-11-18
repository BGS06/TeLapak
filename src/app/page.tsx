import Link from "next/link";
import { PackageOpen, Plus, ShieldCheck, X } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CONDITIONS } from "@/config/constants";
import { getActiveCampusForSession, getCatalogListings } from "@/server/queries";
import type { Enums } from "@/types/database";

interface HomeSearchParams {
  q?: string;
  category?: string;
  condition?: string;
}

function buildFilterHref(current: HomeSearchParams, patch: Partial<HomeSearchParams>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.q?.trim()) params.set("q", next.q.trim());
  if (next.category) params.set("category", next.category);
  if (next.condition) params.set("condition", next.condition);
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

  const campus = await getActiveCampusForSession();
  const listings = await getCatalogListings({
    campusId: campus.id,
    q,
    category: activeCategory,
    condition: activeCondition,
  });

  const hasFilter = Boolean(q || activeCategory || activeCondition);

  return (
    <>
      <SiteHeader initialQuery={q} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5">
        {/* Baris Filter Kategori & Kondisi (PRD §7.1 — bersih ala katalog tanpa banner promo ramai) */}
        <section
          aria-label="Filter katalog"
          className="flex flex-col gap-3 border-b border-[#e6e0d6] pb-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Pilihan Kategori */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Link
              href={buildFilterHref(params, { category: undefined })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                !activeCategory
                  ? "bg-[#181512] text-white"
                  : "border border-[#e6e0d6] bg-white text-[#57524c] hover:bg-[#f3efe9]"
              }`}
            >
              Semua
            </Link>
            {CATEGORIES.map((cat) => {
              const selected = activeCategory === cat.value;
              return (
                <Link
                  key={cat.value}
                  href={buildFilterHref(params, {
                    category: selected ? undefined : cat.value,
                  })}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "bg-[#b3261e] text-white"
                      : "border border-[#e6e0d6] bg-white text-[#57524c] hover:bg-[#f3efe9]"
                  }`}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>

          {/* Filter Kondisi */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="shrink-0 text-xs font-medium text-[#857e76]">Kondisi:</span>
            <Link
              href={buildFilterHref(params, { condition: undefined })}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                !activeCondition
                  ? "bg-[#ebe4db] font-semibold text-[#181512]"
                  : "text-[#57524c] hover:bg-[#f3efe9]"
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
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-[#146c43] font-semibold text-white"
                      : "text-[#57524c] hover:bg-[#f3efe9]"
                  }`}
                >
                  {cond.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Sub-bar status katalog & perlindungan transaksi */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#57524c]">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Menampilkan <strong className="text-[#181512]">{listings.length}</strong> barang siap
              COD di <strong className="text-[#181512]">{campus.name}</strong>
            </span>
            {hasFilter && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full bg-[#f3efe9] px-2.5 py-0.5 font-semibold text-[#b3261e] hover:bg-[#ebe4db]"
              >
                <X className="h-3 w-3" />
                Reset filter
              </Link>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#146c43]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Perlindungan Transaksi: Dana ditahan sementara hingga serah terima di kampus
          </span>
        </div>

        {/* Grid Kartu Barang: 2 kolom di mobile, 4 kolom di desktop (PRD §7.1) */}
        {listings.length > 0 ? (
          <section
            aria-label="Daftar barang"
            className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </section>
        ) : (
          <section className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#dcd5c9] bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3efe9] text-[#857e76]">
              <PackageOpen className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-bold text-[#181512]">
              Belum ada barang yang cocok
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#57524c]">
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

      <SiteFooter />
    </>
  );
}
