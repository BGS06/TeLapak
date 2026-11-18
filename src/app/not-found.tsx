import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="rounded-full border border-[#e6e0d6] bg-white px-3 py-1 text-xs font-semibold text-[#857e76]">
          404 • Halaman Tidak Ditemukan
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#181512]">
          Halaman atau barang sudah tidak tersedia
        </h1>
        <p className="mt-2 text-sm text-[#57524c]">
          Barang yang kamu cari mungkin sudah terjual, disembunyikan penjual, atau tautannya salah.
        </p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog Kampus
          </Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}
