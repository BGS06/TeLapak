"use client";

import imageCompression from "browser-image-compression";
import { validateImageFile } from "@/lib/validations";

/**
 * Validasi & kompresi gambar di sisi klien sebelum diunggah ke Supabase Storage (PRD §7.3 & §9).
 * Foto dikompres ke format WebP, ukuran maks ~1280px, di bawah 800 KB agar hemat kuota & cepat dimuat di WhatsApp/mobile.
 */
export async function validateAndCompressImage(file: File): Promise<File> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.75,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.84,
  });

  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "foto";
  return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
}
