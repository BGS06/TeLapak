"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "telapak-theme";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !isDark;
    const doc = document as DocumentWithViewTransition;

    const applyDomTheme = () => {
      // Matikan transisi CSS individual per komponen saat mutasi DOM agar seluruh
      // halaman berubah dalam 1 frame utuh (tidak berganti per bagian/slice).
      root.classList.add("theme-switching");
      root.classList.toggle("dark", nextDark);
      void root.offsetHeight;
      root.classList.remove("theme-switching");
      setIsDark(nextDark);
    };

    if (typeof doc.startViewTransition === "function") {
      // View Transitions API: browser mengambil snapshot 1 halaman utuh lalu
      // melakukan cross-fade seluruh layar sekaligus di GPU (1 layer utuh).
      doc.startViewTransition(() => {
        applyDomTheme();
      });
    } else {
      // Fallback untuk browser lama: paksa reflow terlebih dahulu sebelum toggle
      // agar seluruh elemen mulai bertransisi pada frame yang sama persis.
      root.classList.add("theme-transitioning");
      void root.offsetHeight;
      root.classList.toggle("dark", nextDark);
      setIsDark(nextDark);
      window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 280);
    }

    try {
      localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    } catch {
      // Ignore storage errors in private mode
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[#d9dfdf] bg-white text-[#171717] select-none hover:bg-[#f2f4f4] active:scale-95"
    >
      <Sun
        className={`h-4 w-4 text-[#f59e0b] transition-transform duration-300 ease-out ${
          mounted && isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 text-[#666666] transition-transform duration-300 ease-out ${
          mounted && isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}
