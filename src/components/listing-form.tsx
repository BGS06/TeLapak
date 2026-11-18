"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { BUSINESS, calculateFees } from "@/config/business";
import { CATEGORIES, CONDITIONS } from "@/config/constants";
import { validateAndCompressImage } from "@/lib/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatIDR } from "@/lib/utils";
import { createListingAction, updateListingAction } from "@/server/actions/listings";
import type { Enums, Listing } from "@/types/database";

interface ListingFormProps {
  userId: string;
  campusName: string;
  meetingPoints: string[];
  initialListing?: Listing;
}

export function ListingForm({
  userId,
  campusName,
  meetingPoints,
  initialListing,
}: ListingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialListing);

  const [title, setTitle] = useState(initialListing?.title ?? "");
  const [category, setCategory] = useState<Enums<"listing_category">>(
    initialListing?.category ?? "parfum",
  );
  const [condition, setCondition] = useState<Enums<"listing_condition">>(
    initialListing?.condition ?? "like_new",
  );
  const [priceIdr, setPriceIdr] = useState<string>(
    initialListing ? String(initialListing.price_idr) : "",
  );
  const [meetingPoint, setMeetingPoint] = useState<string>(
    initialListing?.meeting_point ?? meetingPoints[0] ?? "Lobi Gedung Utama",
  );
  const [meetingPointNote, setMeetingPointNote] = useState<string>(
    initialListing?.meeting_point_note ?? "",
  );
  const [description, setDescription] = useState<string>(initialListing?.description ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(initialListing?.image_urls ?? []);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const numericPrice = Number(priceIdr) || 0;
  const fees = calculateFees(numericPrice >= BUSINESS.minListingPriceIdr ? numericPrice : 0);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const remainingSlots = BUSINESS.maxListingPhotos - imageUrls.length;
    if (remainingSlots <= 0) {
      toast.error(`Maksimal ${BUSINESS.maxListingPhotos} foto per barang.`);
      return;
    }

    const toProcess = files.slice(0, remainingSlots);
    setUploadingCount((c) => c + toProcess.length);

    const supabase = getSupabaseBrowserClient();
    const uploaded: string[] = [];

    for (const file of toProcess) {
      try {
        const compressed = await validateAndCompressImage(file);
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) {
          toast.error(`Gagal mengunggah ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memproses foto.");
      } finally {
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    }

    if (uploaded.length) {
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, BUSINESS.maxListingPhotos));
      toast.success(`${uploaded.length} foto berhasil dikompres & diunggah.`);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingCount > 0) {
      toast.error("Tunggu hingga seluruh foto selesai diunggah.");
      return;
    }

    const payload = {
      title,
      category,
      condition,
      priceIdr: Number(priceIdr),
      meetingPoint,
      meetingPointNote,
      description,
      imageUrls,
    };

    startTransition(async () => {
      const res = initialListing
        ? await updateListingAction(initialListing.id, payload)
        : await createListingAction(payload);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      router.push(`/items/${res.data.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Foto Barang (1–4 Foto, Rasio 1:1) */}
      <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#181512]">
              Foto Barang ({imageUrls.length}/{BUSINESS.maxListingPhotos})
            </h2>
            <p className="text-xs text-[#57524c]">
              Format JPG, PNG, atau WebP (maks. 5 MB/foto). Otomatis dikompres di perangkatmu.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {imageUrls.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[#e6e0d6] bg-[#f3efe9]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
              {idx === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-[#181512]/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Foto Utama
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                aria-label="Hapus foto"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#991b1b] shadow-xs hover:bg-white cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {imageUrls.length < BUSINESS.maxListingPhotos && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#cfc6b8] bg-[#faf8f5] p-3 text-center transition-colors hover:border-[#b3261e] hover:bg-[#fdeceb]/30">
              {uploadingCount > 0 ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[#b3261e]" />
                  <span className="text-xs font-semibold text-[#57524c]">
                    Mengompres ({uploadingCount})...
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-[#b3261e]" />
                  <span className="text-xs font-semibold text-[#181512]">Tambah Foto</span>
                  <span className="text-[11px] text-[#857e76]">Maks. 5 MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploadingCount > 0}
                onChange={handleFilesSelected}
                className="hidden"
              />
            </label>
          )}
        </div>
      </section>

      {/* 2. Informasi Utama Barang */}
      <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
        <div>
          <label className="mb-1 flex items-center justify-between text-xs font-bold text-[#181512]">
            <span>Judul Barang</span>
            <span className="font-normal text-[#857e76] tabular-nums">{title.length}/80</span>
          </label>
          <Input
            required
            minLength={5}
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: HMNS Orgasm EDP 100ml (Sisa 85%, Box Lengkap)"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#181512]">Kategori</label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as Enums<"listing_category">)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#181512]">Kondisi Barang</label>
            <Select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Enums<"listing_condition">)}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Harga & Kalkulator Komisi */}
        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">
            Harga Barang (IDR — minimal {formatIDR(BUSINESS.minListingPriceIdr)})
          </label>
          <Input
            type="number"
            required
            min={BUSINESS.minListingPriceIdr}
            max={BUSINESS.maxListingPriceIdr}
            step={500}
            value={priceIdr}
            onChange={(e) => setPriceIdr(e.target.value)}
            placeholder="85000"
            className="tabular-nums font-bold"
          />

          {numericPrice >= BUSINESS.minListingPriceIdr && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e6e0d6] bg-[#faf8f5] px-3.5 py-2.5 text-xs">
              <span className="text-[#57524c]">
                Setelah komisi platform {BUSINESS.platformFeeBps / 100}% (
                {formatIDR(fees.platformFee)}), saldo bersih yang kamu terima:
              </span>
              <span className="tabular-nums font-extrabold text-[#146c43]">
                {formatIDR(fees.sellerNet)}
              </span>
            </div>
          )}
        </div>

        {/* Titik Temu Kampus */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold text-[#181512]">
              <MapPin className="h-3.5 w-3.5 text-[#b3261e]" />
              Titik Temu ({campusName})
            </label>
            <Select value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)}>
              {meetingPoints.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#181512]">
              Catatan Titik Temu (Opsional)
            </label>
            <Input
              maxLength={160}
              value={meetingPointNote}
              onChange={(e) => setMeetingPointNote(e.target.value)}
              placeholder="Contoh: Senin–Jumat jam 12.00–13.30 dekat loker"
            />
          </div>
        </div>

        {/* Deskripsi Lengkap */}
        <div>
          <label className="mb-1 flex items-center justify-between text-xs font-bold text-[#181512]">
            <span>Deskripsi Lengkap (20–1.000 karakter)</span>
            <span className="font-normal text-[#857e76] tabular-nums">
              {description.length}/1000
            </span>
          </label>
          <Textarea
            required
            minLength={20}
            maxLength={1000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan kondisi barang secara jujur: kapan dibeli, sisa pemakaian, kelengkapan box/charger, atau minus bila ada..."
          />
        </div>
      </section>

      {/* Catatan Perlindungan Transaksi */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-[#e6e0d6] bg-white p-4 text-xs text-[#57524c]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#146c43]" />
        <p>
          Saat pembeli membayar, dana ditahan sementara di platform dan nomor WhatsApp-mu dibuka
          khusus untuk pembeli tersebut. Saldo bersih masuk ke buku besar pencairan begitu pembeli
          menekan <strong>“Barang Diterima”</strong> (atau otomatis 72 jam setelah pembayaran).
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isPending || uploadingCount > 0}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : isEdit ? (
            "Simpan Perubahan"
          ) : (
            "Tayangkan Barang Sekarang"
          )}
        </Button>
      </div>
    </form>
  );
}
