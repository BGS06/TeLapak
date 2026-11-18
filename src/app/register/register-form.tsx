"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, GraduationCap, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { MESSAGES } from "@/config/constants";
import { signUpAction } from "@/server/actions/auth";
import type { Campus, Enums } from "@/types/database";

export function RegisterForm({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [userType, setUserType] = useState<Enums<"user_type">>("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [successInfo, setSuccessInfo] = useState<{
    needsEmailConfirmation: boolean;
    needsManualVerification: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCampus = campuses.find((c) => c.id === campusId) ?? campuses[0];
  const allowedDomains = selectedCampus?.allowed_email_domains ?? [];
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const isCampusDomain = allowedDomains.some((d) => d.toLowerCase() === emailDomain);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userType === "student" && emailDomain && !isCampusDomain) {
      toast.error(MESSAGES.emailDomain);
      return;
    }

    startTransition(async () => {
      const res = await signUpAction({
        campusId,
        userType,
        fullName,
        email,
        password,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      if (res.data.needsEmailConfirmation) {
        setSuccessInfo(res.data);
      } else {
        toast.success("Akun berhasil dibuat!");
        router.push("/profile");
        router.refresh();
      }
    });
  };

  if (successInfo) {
    return (
      <div className="space-y-4 rounded-xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-4 text-xs text-[#181512]">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#146c43]" />
          <div>
            <p className="text-sm font-bold text-[#146c43]">Cek Kotak Masuk Emailmu</p>
            <p className="mt-1 leading-relaxed text-[#3d3833]">
              Kami telah mengirimkan tautan konfirmasi ke <strong>{email}</strong>. Klik tautan
              tersebut untuk mengaktifkan akunmu.
            </p>
            {successInfo.needsManualVerification && (
              <p className="mt-2 rounded-lg border border-[#f8deb0] bg-[#fef6e6] p-2.5 text-[#92400e]">
                Karena kamu menggunakan email pribadi (jalur Alumni/Dosen), setelah masuk silakan
                unggah foto bukti identitas kampus (Kartu Alumni, KTM lama, NIDN, atau ijazah) di
                halaman Profil.
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="w-full">
          <Link href="/login">Ke Halaman Masuk</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-[#181512]">Kampus</label>
        <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Pilihan Peran Civitas (PRD §3) */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-[#181512]">Peran di Kampus</label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "student", label: "Mahasiswa" },
              { value: "lecturer", label: "Dosen" },
              { value: "alumni", label: "Alumni" },
            ] as const
          ).map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setUserType(role.value)}
              className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                userType === role.value
                  ? "border-[#b3261e] bg-[#fdeceb] text-[#b3261e]"
                  : "border-[#e6e0d6] bg-white text-[#57524c] hover:bg-[#f3efe9]"
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-[#181512]">
          Nama Lengkap (Sesuai KTM / Rekening Pencairan)
        </label>
        <Input
          required
          minLength={2}
          maxLength={80}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Contoh: Nadia Putri Pratama"
        />
        <p className="mt-1 text-[11px] text-[#857e76]">
          Gunakan nama asli. Saat menjual barang, nama pemilik rekening wajib sesuai nama ini.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-[#181512]">
          {userType === "student" ? "Email Resmi Kampus" : "Email Kampus atau Email Pribadi"}
        </label>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={
            userType === "student"
              ? `nama@${allowedDomains[0] ?? "student.telkomuniversity.ac.id"}`
              : "nama@telkomuniversity.ac.id atau email pribadi"
          }
        />

        {/* Kotak info jalur verifikasi (PRD §3) */}
        {userType === "student" ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[#57524c]">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#146c43]" />
            <span>
              Mahasiswa aktif wajib memakai domain resmi:{" "}
              <strong>{allowedDomains.map((d) => `@${d}`).join(" / ")}</strong> (otomatis
              terverifikasi).
            </span>
          </p>
        ) : (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-[#57524c]">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#92400e]" />
            <span>
              Jika memakai email pribadi, kamu akan diminta mengunggah foto bukti identitas kampus
              (Kartu Alumni / KTM lama / NIDN / Ijazah) di halaman Profil untuk disetujui admin.
            </span>
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-[#181512]">Kata Sandi</label>
        <Input
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mendaftarkan Akun...
          </>
        ) : (
          "Buat Akun Civitas"
        )}
      </Button>

      <p className="text-center text-xs text-[#57524c]">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-bold text-[#b3261e] hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  );
}
