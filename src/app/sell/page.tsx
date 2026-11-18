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
        <main className="mx-auto max-w-xl flex-1 px-4 py-12">
          <div className="rounded-2xl border border-[#f8deb0] bg-[#fef6e6] p-6 text-sm text-[#92400e]">
            <h1 className="text-base font-bold text-[#181512]">
              Hubungkan Supabase untuk Memasang Barang
            </h1>
            <p className="mt-1 text-xs leading-relaxed">
              Aplikasi saat ini berjalan dalam mode pratinjau lokal. Salin{" "}
              <code className="rounded bg-[#fbe9c6] px-1 py-0.5">.env.example</code> menjadi{" "}
              <code className="rounded bg-[#fbe9c6] px-1 py-0.5">.env.local</code> lalu jalankan
              migrasi SQL di folder <code className="rounded bg-[#fbe9c6] px-1 py-0.5">supabase/migrations</code>.
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold tracking-tight text-[#181512] sm:text-2xl">
            Pasang Barang Bekas
          </h1>
          <p className="mt-1 text-xs text-[#57524c]">
            Tanpa perlu buka toko. Pasang dalam 1 menit, bagikan ke grup WhatsApp, dan serah terima
            aman di {campus.name}.
          </p>
        </div>

        {!readiness.ready ? (
          <div className="rounded-2xl border border-[#f8deb0] bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef6e6] text-[#92400e]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#181512]">
                  Syarat Menjadi Penjual (Tingkat 2)
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#57524c]">
                  {MESSAGES.sellerIncomplete}
                </p>
              </div>
            </div>

            <ul className="space-y-2 rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-4 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${readiness.verified ? "text-[#146c43]" : "text-[#cfc6b8]"}`}
                />
                <span className={readiness.verified ? "font-semibold text-[#181512]" : "text-[#57524c]"}>
                  1. Verifikasi status civitas kampus ({profile.verification_status})
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${readiness.whatsapp ? "text-[#146c43]" : "text-[#cfc6b8]"}`}
                />
                <span className={readiness.whatsapp ? "font-semibold text-[#181512]" : "text-[#57524c]"}>
                  2. Nomor WhatsApp aktif untuk janjian di titik temu
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-4 w-4 ${readiness.payout ? "text-[#146c43]" : "text-[#cfc6b8]"}`}
                />
                <span className={readiness.payout ? "font-semibold text-[#181512]" : "text-[#57524c]"}>
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
