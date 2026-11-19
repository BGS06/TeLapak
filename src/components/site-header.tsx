import Link from "next/link";
import { ChevronDown, MapPin, Package, Plus, Search, ShieldCheck, User } from "lucide-react";
import { BUSINESS } from "@/config/business";
import { CATEGORIES } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { firstName } from "@/lib/utils";
import { getCurrentProfile } from "@/server/auth";
import { getActiveCampusForSession } from "@/server/queries";

export async function SiteHeader({
  initialQuery = "",
  activeCategory,
}: {
  initialQuery?: string;
  activeCategory?: string;
}) {
  const [profile, campus] = await Promise.all([
    getCurrentProfile(),
    getActiveCampusForSession(),
  ]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#edf2f2] bg-white">
      {!isSupabaseConfigured && (
        <div className="border-b border-[#edf2f2] bg-[#f2f4f4] px-4 py-1.5 text-center text-xs text-[#666666]">
          <span className="font-semibold text-[#171717]">Mode Pratinjau Lokal:</span> menampilkan
          katalog contoh {campus.name}. Isi{" "}
          <code className="rounded border border-[#d9dfdf] bg-white px-1.5 py-0.5 text-[#b3261e]">
            .env.local
          </code>{" "}
          untuk mengaktifkan autentikasi & transaksi Supabase.
        </div>
      )}

      {/* Tier 1: Logo, Search Bar, & Tombol Aksi */}
      <div className="mx-auto max-w-[1280px] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="group flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-[#b3261e] transition-opacity group-hover:opacity-90">
                {BUSINESS.productName}
              </span>
            </Link>
            <span className="hidden items-center gap-1 rounded-md bg-[#f2f4f4] px-2.5 py-1 text-[11px] font-medium text-[#666666] xl:inline-flex">
              <MapPin className="h-3 w-3 text-[#b3261e]" />
              {campus.name}
            </span>
          </div>

          <form action="/" method="get" className="hidden max-w-2xl flex-1 md:block">
            <div className="flex h-10 w-full items-center rounded-md bg-[#f2f4f4] px-3 transition focus-within:bg-white focus-within:ring-1 focus-within:ring-[#b3261e]">
              <span className="mr-3 flex select-none items-center gap-1 border-r border-[#d9dfdf] pr-3 text-xs font-medium text-[#666666]">
                Katalog
                <ChevronDown className="h-3.5 w-3.5 text-[#8c8c8c]" />
              </span>
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#8c8c8c]" />
              <input
                type="search"
                name="q"
                defaultValue={initialQuery}
                placeholder="Cari parfum, kalkulator, buku, mouse..."
                className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#8c8c8c] focus:outline-none"
              />
            </div>
          </form>

          <nav className="flex shrink-0 items-center gap-2">
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                title="Panel Admin"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d9dfdf] bg-white px-3 text-xs font-medium text-[#171717] transition hover:bg-[#f2f4f4]"
              >
                <ShieldCheck className="h-4 w-4 text-[#b3261e]" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {profile && (
              <Link
                href="/orders"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-[#666666] transition hover:bg-[#f2f4f4] hover:text-[#171717]"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Pesanan</span>
              </Link>
            )}

            {profile ? (
              <Link
                href="/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d9dfdf] bg-white px-3 text-xs font-medium text-[#171717] transition hover:bg-[#f2f4f4]"
              >
                <User className="h-4 w-4 text-[#666666]" />
                <span className="max-w-[96px] truncate">{firstName(profile.full_name)}</span>
                {profile.verification_status === "verified" && (
                  <span
                    className="h-2 w-2 rounded-full bg-[#146c43]"
                    title="Terverifikasi Kampus"
                  />
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md border border-[#b3261e] bg-white px-3.5 text-xs font-semibold text-[#b3261e] transition hover:bg-[#fdf2f2]"
              >
                Daftar | Masuk
              </Link>
            )}

            <Link
              href="/sell"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#b3261e] px-4 text-xs font-semibold text-white transition hover:bg-[#8f1c15]"
            >
              <Plus className="h-4 w-4" />
              <span>Jual Barang</span>
            </Link>
          </nav>
        </div>

        {/* Pencarian Mobile */}
        <form action="/" method="get" className="mt-2.5 md:hidden">
          <div className="flex h-10 w-full items-center rounded-md bg-[#f2f4f4] px-3 transition focus-within:bg-white focus-within:ring-1 focus-within:ring-[#b3261e]">
            <Search className="mr-2 h-4 w-4 shrink-0 text-[#8c8c8c]" />
            <input
              type="search"
              name="q"
              defaultValue={initialQuery}
              placeholder="Cari barang bekas di kampus..."
              className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#8c8c8c] focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Tier 2: Tab Kategori Horizontal Khas Vinted */}
      <nav aria-label="Navigasi kategori" className="border-t border-[#edf2f2] bg-white">
        <div className="no-scrollbar mx-auto flex h-10 max-w-[1280px] items-center gap-6 overflow-x-auto px-4">
          <Link
            href="/"
            className={`relative inline-flex h-full shrink-0 items-center text-xs transition-colors ${
              !activeCategory
                ? "font-semibold text-[#b3261e] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:bg-[#b3261e] after:content-['']"
                : "font-medium text-[#666666] hover:text-[#171717]"
            }`}
          >
            Semua Barang
          </Link>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <Link
                key={cat.value}
                href={`/?category=${cat.value}`}
                className={`relative inline-flex h-full shrink-0 items-center text-xs transition-colors ${
                  isActive
                    ? "font-semibold text-[#b3261e] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2px] after:bg-[#b3261e] after:content-['']"
                    : "font-medium text-[#666666] hover:text-[#171717]"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
          <Link
            href="#cara-kerja"
            className="ml-auto hidden shrink-0 text-xs font-medium text-[#8c8c8c] transition-colors hover:text-[#b3261e] sm:inline-flex"
          >
            Cara Kerja COD Kampus
          </Link>
        </div>
      </nav>
    </header>
  );
}