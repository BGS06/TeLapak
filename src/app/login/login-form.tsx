"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/server/actions/auth";

const QUICK_ACCOUNTS = [
  {
    label: "Raka (Pembeli Mahasiswa)",
    roleHint: "Siap beli barang & uji QRIS",
    email: "raka@student.telkomuniversity.ac.id",
    password: "TeLapak123!",
  },
  {
    label: "Nadia (Penjual Mahasiswa)",
    roleHint: "Pemilik parfum HMNS & sleeve",
    email: "nadia@student.telkomuniversity.ac.id",
    password: "TeLapak123!",
  },
  {
    label: "Dimas (Penjual Alumni)",
    roleHint: "Alumni terverifikasi",
    email: "dimas.alumni@gmail.com",
    password: "TeLapak123!",
  },
  {
    label: "Alya (Admin Kampus)",
    roleHint: "Akses /admin (Verifikasi, Sengketa, Payout)",
    email: "admin@telkomuniversity.ac.id",
    password: "TeLapak123!",
  },
] as const;

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const performLogin = (targetEmail: string, targetPassword: string) => {
    setEmail(targetEmail);
    setPassword(targetPassword);
    startTransition(async () => {
      const res = await signInAction({ email: targetEmail, password: targetPassword });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Berhasil masuk!");
      const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
      router.push(safeNext);
      router.refresh();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-[#181512]">Alamat Email</label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@student.telkomuniversity.ac.id"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-bold text-[#181512]">Kata Sandi</label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#b3261e] hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Masuk ke Akun
            </>
          )}
        </Button>

        <p className="text-center text-xs text-[#57524c]">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold text-[#b3261e] hover:underline">
            Daftar sebagai Mahasiswa, Dosen, atau Alumni
          </Link>
        </p>
      </form>

      {/* Akun Demo 1-Klik untuk Uji Alur Lengkap (Login -> Checkout -> Pembayaran -> Payout) */}
      <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#181512]">
          <Sparkles className="h-3.5 w-3.5 text-[#b3261e]" />
          <span>Masuk Cepat Akun Demo (1-Klik)</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {QUICK_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={isPending}
              onClick={() => performLogin(acc.email, acc.password)}
              className="flex flex-col items-start rounded-lg border border-[#e6e0d6] bg-white p-2.5 text-left transition-colors hover:border-[#b3261e] hover:bg-[#fdeceb]/30 disabled:opacity-50 cursor-pointer"
            >
              <span className="text-xs font-bold text-[#181512]">{acc.label}</span>
              <span className="mt-0.5 text-[11px] text-[#57524c]">{acc.roleHint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
