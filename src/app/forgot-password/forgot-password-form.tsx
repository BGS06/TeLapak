"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await requestPasswordResetAction(email);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSent(true);
      toast.success(res.message);
    });
  };

  if (sent) {
    return (
      <div className="space-y-4 rounded-xl border border-[#bfe3ce] bg-[#e8f5ee] p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#146c43] shadow-2xs">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#146c43]">Tautan Pemulihan Terkirim</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#146c43]">
            Periksa kotak masuk (atau folder spam) email <strong>{email}</strong>, lalu klik
            tautan pemulihan untuk membuat kata sandi baru.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm" className="w-full">
          <Link href="/login">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Halaman Masuk
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-[#171717]">Alamat Email Terdaftar</label>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@student.telkomuniversity.ac.id"
        />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengirim Tautan...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Kirim Tautan Reset Kata Sandi
          </>
        )}
      </Button>

      <p className="text-center text-xs text-[#666666]">
        Ingat kata sandimu?{" "}
        <Link href="/login" className="font-bold text-[#b3261e] hover:underline">
          Kembali masuk
        </Link>
      </p>
    </form>
  );
}
