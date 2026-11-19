import Link from "next/link";
import { Handshake, MapPin, ShieldCheck } from "lucide-react";
import { BUSINESS } from "@/config/business";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[#b3261e] text-white mb-safe-nav md:pb-0">
      <div className="mx-auto max-w-[1280px] px-4 py-10">
        {/* 3 Pilar Keamanan Transaksi Kampus */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/15 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dana Ditahan Sementara</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/85">
                Pembayaran QRIS/e-wallet ditahan aman di platform dan baru diteruskan ke penjual
                setelah barang kamu terima.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/15 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Serah Terima di Kampus</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/85">
                Tanpa ongkir & tanpa ribet packing. Ketemuan langsung di lobi, perpustakaan, atau
                kantin kampus.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/15 text-white">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Khusus Civitas Terverifikasi</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/85">
                Mahasiswa, dosen, dan alumni diverifikasi lewat email resmi kampus atau bukti
                identitas civitas.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/80 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()}{" "}
            <strong className="font-semibold text-white">{BUSINESS.productName}</strong> —{" "}
            {BUSINESS.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="transition-colors hover:text-white hover:underline">
              Katalog
            </Link>
            <Link href="/sell" className="transition-colors hover:text-white hover:underline">
              Pasang Barang
            </Link>
            <Link href="/orders" className="transition-colors hover:text-white hover:underline">
              Riwayat Pesanan
            </Link>
            <Link href="/profile" className="transition-colors hover:text-white hover:underline">
              Akun & Verifikasi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
