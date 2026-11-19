"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "telapak-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !isDark;

    // Aktifkan transisi sinkron di seluruh elemen selama 360ms agar perpindahan
    // warna latar, kartu, border, dan teks mengalir halus secara bersamaan.
    root.classList.add("theme-transitioning");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setIsDark(nextDark);
    root.classList.toggle("dark", nextDark);

    try {
      localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    } catch {
      // Ignore storage errors in private mode
    }

    timeoutRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 360);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[#d9dfdf] bg-white text-[#171717] select-none transition-transform duration-150 hover:bg-[#f2f4f4] active:scale-90"
    >
      <Sun
        className={`h-4 w-4 text-[#f59e0b] transition-all duration-300 ease-out ${
          mounted && isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 text-[#666666] transition-all duration-300 ease-out ${
          mounted && isDark
            ? "rotate-90 scale-50 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}
