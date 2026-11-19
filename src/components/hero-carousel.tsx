"use client";

import { useEffect, useRef, useState } from "react";
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
  const touchStartX = useRef<number | null>(null);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    setIsPaused(false);
    if (Math.abs(delta) > 42) {
      if (delta < 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <section
      aria-label="Sorotan TeLapak"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="group relative overflow-hidden border-b border-[#edf2f2] bg-[#171717] select-none"
    >
      {/* Latar Belakang Multi-Foto Produk (Crossfade GPU-accelerated) */}
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.src}
          aria-hidden={idx !== activeIndex}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out will-change-opacity ${
            idx === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={slide.alt}
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </div>
      ))}

      {/* Overlay Gelap Halus agar Kartu Kiri & 3 Kartu Kanan Tetap Kontras */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/45 to-black/50"
      />

      {/* Tombol Panah Kiri (tampil di layar >= sm; di mobile cukup geser/swipe) */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Gambar sebelumnya"
        className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/90 text-[#171717] shadow-md backdrop-blur-xs transition hover:bg-white hover:text-[#b3261e] active:scale-95 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Tombol Panah Kanan */}
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Gambar berikutnya"
        className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/90 text-[#171717] shadow-md backdrop-blur-xs transition hover:bg-white hover:text-[#b3261e] active:scale-95 sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Konten Utama Hero — di mobile memakai px-4 agar kartu putih lapang */}
      <div className="relative z-10 mx-auto flex min-h-[290px] max-w-[1280px] flex-col justify-between gap-5 px-4 pt-5 pb-12 sm:min-h-[340px] sm:px-16 sm:pt-8 md:min-h-[380px] lg:flex-row lg:items-center lg:py-12">
        {/* Sisi Kiri: Kartu Putih Melayang ala Vinted */}
        <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg sm:rounded-lg sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#fdf2f2] px-2.5 py-1 text-[11px] font-semibold text-[#b3261e]">
            <Sparkles className="h-3.5 w-3.5" />
            Khusus Civitas {campusName}
          </span>
          <h1 className="mt-2.5 text-lg font-extrabold leading-snug tracking-tight text-[#171717] sm:mt-3 sm:text-2xl">
            Barang kuliah & kos jarang dipakai? Jual aja di sini.
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#666666] sm:mt-2">
            Pasang iklan gratis dalam 1 menit, dana pembayaran ditahan sementara sampai serah terima
            COD di area kampus.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-center sm:gap-2.5">
            <Link
              href="/sell"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#b3261e] px-4 text-xs font-semibold text-white transition hover:bg-[#8f1c15] active:scale-[0.98]"
            >
              Mulai Jual Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#cara-kerja"
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold text-[#b3261e] transition hover:bg-[#fdf2f2] active:scale-[0.98]"
            >
              Pelajari Cara Kerja COD
            </a>
          </div>
        </div>

        {/* Sisi Kanan: 3 Kartu Keunggulan Transparan */}
        <div className="hidden max-w-md space-y-3 text-white lg:block">
          <div className="flex items-center gap-3 rounded-lg border border-white/25 bg-white/15 p-3.5 shadow-sm backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#b3261e]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Perlindungan Transaksi Kampus</p>
              <p className="text-[11px] text-white/90">
                Dana pembeli ditahan sementara sampai barang dicek langsung.
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
        className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 backdrop-blur-xs"
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
