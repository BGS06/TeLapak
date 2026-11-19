"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const HERO_SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1600&q=80",
    alt: "Koleksi aksesoris dan barang kasual mahasiswa",
  },
  {
    src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80",
    alt: "Perangkat elektronik, jam tangan, dan gadget kuliah",
  },
  {
    src: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1600&q=80",
    alt: "Parfum dan perlengkapan harian layak pakai",
  },
  {
    src: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1600&q=80",
    alt: "Sepatu dan perlengkapan olahraga kampus",
  },
];

export function HeroCarousel({ campusName }: { campusName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const total = HERO_SLIDES.length;

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, total]);

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <section
      aria-label="Sorotan LapakTelu"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="group relative overflow-hidden border-b border-[#edf2f2] bg-[#171717]"
    >
      {/* Latar Belakang Multi-Foto Produk (Crossfade) */}
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.src}
          aria-hidden={idx !== activeIndex}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={slide.alt}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ))}

      {/* Overlay Gelap Halus agar Kartu Kiri & 3 Kartu Kanan Tetap Kontras */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/40 to-black/50"
      />

      {/* Tombol Panah Kiri */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Gambar sebelumnya"
        className="absolute left-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/90 text-[#171717] shadow-md backdrop-blur-xs transition hover:bg-white hover:text-[#b3261e] sm:left-4 sm:h-10 sm:w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Tombol Panah Kanan */}
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Gambar berikutnya"
        className="absolute right-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/90 text-[#171717] shadow-md backdrop-blur-xs transition hover:bg-white hover:text-[#b3261e] sm:right-4 sm:h-10 sm:w-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Konten Utama Hero (Padding kiri-kanan memberi ruang untuk tombol panah) */}
      <div className="relative z-10 mx-auto flex min-h-[340px] max-w-[1280px] flex-col justify-between gap-6 px-12 pt-8 pb-12 sm:px-16 md:min-h-[380px] lg:flex-row lg:items-center lg:py-12">
        {/* Sisi Kiri: Kartu Putih Melayang ala Vinted */}
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#fdf2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b3261e]">
            <Sparkles className="h-3.5 w-3.5" />
            Khusus Civitas {campusName}
          </span>
          <h1 className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-[#171717] sm:text-2xl">
            Barang kuliah & kos jarang dipakai? Jual aja di sini.
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[#666666]">
            Pasang iklan gratis dalam 1 menit, dana pembayaran ditahan aman sampai serah terima
            COD di area kampus.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/sell"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-[#b3261e] px-4 text-xs font-semibold text-white transition hover:bg-[#8f1c15]"
            >
              Mulai Jual Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#cara-kerja"
              className="inline-flex h-10 items-center justify-center rounded-md px-3 text-xs font-semibold text-[#b3261e] transition hover:bg-[#fdf2f2]"
            >
              Pelajari Cara Kerja COD
            </a>
          </div>
        </div>

        {/* Sisi Kanan: 3 Kartu Keunggulan Transparan yang Dipertahankan */}
        <div className="hidden max-w-md space-y-3 text-white lg:block">
          <div className="flex items-center gap-3 rounded-lg border border-white/25 bg-white/15 p-3.5 shadow-sm backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#b3261e]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Perlindungan Transaksi Escrow</p>
              <p className="text-[11px] text-white/90">
                Uang pembeli ditahan aman sampai barang dicek langsung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-white/25 bg-white/15 p-3.5 shadow-sm backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#b3261e]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold">COD Titik Temu Kampus (Rp 0 Ongkir)</p>
              <p className="text-[11px] text-white/90">
                Ketemuan di Lobi Gedung Utama, Perpustakaan, atau Kantin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-white/25 bg-white/15 p-3.5 shadow-sm backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#b3261e]">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold">100% Civitas Terverifikasi</p>
              <p className="text-[11px] text-white/90">
                Transaksi sesama mahasiswa, dosen, & alumni Tel-U Surabaya.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bullet Indikator Slide di Bagian Bawah Gambar */}
      <div
        role="tablist"
        aria-label="Pilih slide gambar"
        className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-xs"
      >
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                isActive ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/85"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}