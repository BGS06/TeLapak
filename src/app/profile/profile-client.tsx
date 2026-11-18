"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PAYOUT_METHODS } from "@/config/constants";
import { validateAndCompressImage } from "@/lib/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  submitVerificationDocAction,
  updateSellerProfileAction,
} from "@/server/actions/profile";
import type { Profile } from "@/types/database";

export function VerificationDocUploader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await validateAndCompressImage(file);
      const path = `${profile.id}/identitas-${Date.now()}.webp`;
      const supabase = getSupabaseBrowserClient();

      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(path, compressed, { contentType: "image/webp" });

      if (uploadError) {
        toast.error(`Gagal mengunggah bukti: ${uploadError.message}`);
        return;
      }

      const res = await submitVerificationDocAction(path);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses foto bukti.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#f8deb0] bg-[#fef6e6] p-4 text-xs text-[#92400e]">
      <div>
        <p className="font-bold text-[#181512]">
          Verifikasi Manual Alumni / Dosen (Tingkat 1)
        </p>
        <p className="mt-0.5 leading-relaxed">
          Unggah foto Kartu Alumni, KTM lama, kartu NIDN/Pegawai, atau ijazah. Dokumen disimpan di
          penyimpanan privat dan <strong>otomatis dihapus</strong> segera setelah diverifikasi
          admin.
        </p>
        {profile.verification_status === "rejected" && profile.verification_rejection_reason && (
          <p className="mt-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] p-2.5 font-semibold text-[#991b1b]">
            Alasan penolakan sebelumnya: “{profile.verification_rejection_reason}”
          </p>
        )}
      </div>

      {profile.verification_doc_url && profile.verification_status === "pending" ? (
        <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 font-semibold text-[#146c43]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Bukti identitas sudah terkirim dan sedang dalam antrean verifikasi admin.</span>
        </div>
      ) : null}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b3261e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#931d16]">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengompres & Mengunggah...
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" />
            {profile.verification_doc_url ? "Unggah Ulang Foto Bukti" : "Unggah Foto Bukti Identitas"}
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}

export function SellerProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsapp_number ?? "");
  const [payoutMethod, setPayoutMethod] = useState(
    profile.payout_method ?? PAYOUT_METHODS[0]!.value,
  );
  const [payoutAccountNumber, setPayoutAccountNumber] = useState(
    profile.payout_account_number ?? "",
  );
  const [payoutAccountName, setPayoutAccountName] = useState(
    profile.payout_account_name ?? profile.full_name,
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSellerProfileAction({
        fullName,
        whatsappNumber,
        payoutMethod,
        payoutAccountNumber,
        payoutAccountName,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">Nama Lengkap Akun</label>
          <Input
            required
            minLength={2}
            maxLength={80}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (!profile.payout_account_name) setPayoutAccountName(e.target.value);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">
            Nomor WhatsApp Aktif
          </label>
          <Input
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="081234567890"
            className="font-mono"
          />
          <p className="mt-1 text-[11px] text-[#857e76]">
            Hanya ditampilkan ke pembeli yang sudah menyelesaikan pembayaran.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">
            Bank / E-Wallet Pencairan
          </label>
          <Select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
            {PAYOUT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} ({m.kind === "bank" ? "Bank" : "E-Wallet"})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">
            Nomor Rekening / E-Wallet
          </label>
          <Input
            required
            pattern="[0-9]{6,20}"
            value={payoutAccountNumber}
            onChange={(e) => setPayoutAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="1234567890"
            className="font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">
            Nama Pemilik Rekening
          </label>
          <Input
            required
            value={payoutAccountName}
            onChange={(e) => setPayoutAccountName(e.target.value)}
            placeholder="Wajib sama dengan nama akun"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-[#857e76]">
          Demi keamanan transaksi, nama pemilik rekening wajib sama persis dengan nama lengkap akun.
        </p>
        <Button type="submit" variant="primary" size="md" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Data Penjual
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
