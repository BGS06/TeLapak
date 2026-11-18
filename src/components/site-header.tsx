import Link from "next/link";
import { MapPin, Package, Plus, Search, ShieldCheck, User } from "lucide-react";
import { BUSINESS } from "@/config/business";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { firstName } from "@/lib/utils";
import { getCurrentProfile } from "@/server/auth";
import { getActiveCampusForSession } from "@/server/queries";

export async function SiteHeader({ initialQuery = "" }: { initialQuery?: string }) {
  const [profile, campus] = await Promise.all([
    getCurrentProfile(),
    getActiveCampusForSession(),
  ]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e6e0d6] bg-[#faf8f5]/95 backdrop-blur-md">
      {!isSupabaseConfigured && (
        <div className="border-b border-[#f8deb0] bg-[#fef6e6] px-4 py-1.5 text-center text-xs text-[#92400e]">
          <span className="font-semibold">Mode Pratinjau Lokal:</span> menampilkan katalog contoh{" "}
          {campus.name}. Isi <code className="rounded bg-[#fbe9c6] px-1 py-0.5">.env.local</code>{" "}
          untuk mengaktifkan autentikasi & transaksi Supabase.
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Kampus */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b3261e] text-sm font-extrabold tracking-tight text-white shadow-xs transition-transform group-hover:scale-[1.02]">
                LT
              </span>
              <div className="flex flex-col">
                <span className="text-base font-extrabold leading-none tracking-tight text-[#181512]">
                  {BUSINESS.productName}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#57524c]">
                  <MapPin className="h-3 w-3 text-[#b3261e]" />
                  {campus.name}
                </span>
              </div>
            </Link>
          </div>

          {/* Pencarian Desktop */}
          <form action="/" method="get" className="hidden flex-1 max-w-md md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#857e76]" />
              <input
                type="search"
                name="q"
                defaultValue={initialQuery}
                placeholder="Cari parfum, kalkulator, buku, mouse..."
                className="h-10 w-full rounded-xl border border-[#dcd5c9] bg-white pl-10 pr-4 text-sm text-[#181512] placeholder:text-[#857e76] focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15"
              />
            </div>
          </form>

          {/* Aksi Kanan */}
          <nav className="flex items-center gap-2">
            {profile?.role === "admin" && (
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin" title="Panel Admin">
                  <ShieldCheck className="h-4 w-4 text-[#b3261e]" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}

            {profile && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/orders">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Pesanan</span>
                </Link>
              </Button>
            )}

            {profile ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/profile" className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#57524c]" />
                  <span className="max-w-[96px] truncate">{firstName(profile.full_name)}</span>
                  {profile.verification_status === "verified" && (
                    <span
                      className="h-2 w-2 rounded-full bg-[#146c43]"
                      title="Terverifikasi Kampus"
                    />
                  )}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href="/login">Masuk</Link>
              </Button>
            )}

            <Button asChild variant="primary" size="sm">
              <Link href="/sell">
                <Plus className="h-4 w-4" />
                <span>Jual Barang</span>
              </Link>
            </Button>
          </nav>
        </div>

        {/* Pencarian Mobile */}
        <form action="/" method="get" className="mt-2.5 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#857e76]" />
            <input
              type="search"
              name="q"
              defaultValue={initialQuery}
              placeholder="Cari barang bekas di kampus..."
              className="h-10 w-full rounded-xl border border-[#dcd5c9] bg-white pl-10 pr-4 text-sm text-[#181512] placeholder:text-[#857e76] focus:border-[#b3261e] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/15"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
