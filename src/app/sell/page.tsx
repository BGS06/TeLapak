import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { ListingForm } from "@/components/listing-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { requireProfile, sellerReadiness } from "@/server/auth";
import { getActiveCampusForSession } from "@/server/queries";

export const metadata: Metadata = {
  title: "Pasang Barang Bekas",
};

export default async function SellPage() {
  if (!isSupabaseConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
          <div className="rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/70 p-6 text-sm text-[#666666]">
            <h1 className="text-base font-bold text-[#171717]">
              Hubungkan Supabase untuk Memasang Barang
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed">
              Aplikasi saat ini berjalan dalam mode pratinjau lokal. Salin{" "}
              <code className="rounded border border-[#d9dfdf] bg-white px-1.5 py-0.5 text-[#b3261e]">
                .env.example
              </code>{" "}
              menjadi{" "}
              <code className="rounded border border-[#d9dfdf] bg-white px-1.5 py-0.5 text-[#b3261e]">
                .env.local
              </code>{" "}
              lalu jalankan migrasi SQL di folder{" "}
              <code className="rounded border border-[#d9dfdf] bg-white px-1.5 py-0.5 text-[#171717]">
                supabase/migrations
              </code>
              .
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const [profile, campus] = await Promise.all([
    requireProfile("/sell"),
    getActiveCampusForSession(),
  ]);

  const readiness = sellerReadiness(profile);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12">
        <div className="mb-6 border-b border-[#edf2f2] pb-4">
          <h1 className="text-xl font-extrabold tracking-tight text-[#171717] sm:text-2xl">
            Jual Barang
          </h1>
          <p className="mt-1 text-xs text-[#666666]">
            Tanpa perlu buka toko. Pasang dalam 1 menit, bagikan ke grup WhatsApp, dan serah terima
            aman di <strong className="font-semibold text-[#171717]">{campus.name}</strong>.
          </p>
        </div>

        {!readiness.ready ? (
          <div className="space-y-5 rounded-lg border border-[#edf2f2] bg-white p-6">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf2f2] text-[#b3261e]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#171717]">
                  Lengkapi Profil Penjual Sebelum Memasang Barang
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#666666]">
                  {MESSAGES.sellerIncomplete}
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 rounded-md border border-[#edf2f2] bg-[#f2f4f4]/70 p-4 text-xs">
              <li className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${readiness.verified ? "text-[#146c43]" : "text-[#8c8c8c]"}`}
                />
                <span
                  className={
                    readiness.verified ? "font-semibold text-[#171717]" : "text-[#666666]"
                  }
                >
                  1. Verifikasi status civitas kampus ({profile.verification_status})
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${readiness.whatsapp ? "text-[#146c43]" : "text-[#8c8c8c]"}`}
                />
                <span
                  className={
                    readiness.whatsapp ? "font-semibold text-[#171717]" : "text-[#666666]"
                  }
                >
                  2. Nomor WhatsApp aktif untuk janjian di titik temu
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 ${readiness.payout ? "text-[#146c43]" : "text-[#8c8c8c]"}`}
                />
                <span
                  className={readiness.payout ? "font-semibold text-[#171717]" : "text-[#666666]"
                  }
                >
                  3. Rekening bank / e-wallet pencairan (nama pemilik wajib sesuai nama akun)
                </span>
              </li>
            </ul>

            <Button asChild variant="primary">
              <Link href="/profile?onboarding=seller">
                Lengkapi Data Penjual Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <ListingForm
            userId={profile.id}
            campusName={campus.name}
            meetingPoints={campus.meeting_points}
          />
        )}
      </main>

      <SiteFooter />
    </>
  );
}