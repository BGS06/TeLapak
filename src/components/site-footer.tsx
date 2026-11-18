import Link from "next/link";
import { Handshake, MapPin, ShieldCheck } from "lucide-react";
import { BUSINESS } from "@/config/business";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#e6e0d6] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fdeceb] text-[#b3261e]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181512]">Dana Ditahan Sementara</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#57524c]">
                Pembayaran QRIS/e-wallet ditahan aman di platform dan baru diteruskan ke penjual
                setelah barang kamu terima.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f5ee] text-[#146c43]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181512]">Serah Terima di Kampus</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#57524c]">
                Tanpa ongkir & tanpa ribet packing. Ketemuan langsung di lobi, perpustakaan, atau
                kantin kampus.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3efe9] text-[#181512]">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181512]">Khusus Civitas Terverifikasi</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#57524c]">
                Mahasiswa, dosen, dan alumni diverifikasi lewat email resmi kampus atau bukti
                identitas civitas.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-[#e6e0d6] pt-6 text-xs text-[#857e76] sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} <strong className="text-[#181512]">{BUSINESS.productName}</strong> —{" "}
            {BUSINESS.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-[#181512]">
              Katalog
            </Link>
            <Link href="/sell" className="hover:text-[#181512]">
              Pasang Barang
            </Link>
            <Link href="/orders" className="hover:text-[#181512]">
              Riwayat Pesanan
            </Link>
            <Link href="/profile" className="hover:text-[#181512]">
              Akun & Verifikasi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
