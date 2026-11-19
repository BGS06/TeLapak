import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** 85000 → "Rp 85.000" */
export function formatIDR(value: number) {
  // Intl menghasilkan "Rp 85.000" dengan non-breaking space; normalisasi spasi.
  return idr.format(value).replace(/\u00a0/g, " ");
}

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const dateOnly = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} WIB`;
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));

const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

export function formatRelative(iso: string, now = Date.now()) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "baru saja";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 86_400), "day");
  return formatDate(iso);
}

/** Kode pesanan pendek yang ramah dibaca manusia, mis. "TL-8F3A2C". */
export const orderCode = (id: string) => `TL-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

/** Normalisasi nomor WhatsApp Indonesia ke format 628xxxxxxxxx. Null jika tidak valid. */
export function normalizeWhatsApp(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let n = digits;
  if (n.startsWith("08")) n = `62${n.slice(1)}`;
  else if (n.startsWith("8")) n = `62${n}`;
  return /^628\d{7,12}$/.test(n) ? n : null;
}

/** 6281234567890 → "+62 812-3456-7890" */
export function formatWhatsApp(n: string) {
  const local = n.replace(/^62/, "");
  return `+62 ${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
}

/** Normalisasi nama untuk perbandingan pemilik rekening vs nama akun. */
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
