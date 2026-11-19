import type { Metadata } from "next";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Atur Ulang Kata Sandi",
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-14">
        <div className="rounded-xl border border-[#edf2f2] bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-5">
            <h1 className="text-xl font-extrabold tracking-tight text-[#171717]">
              Buat kata sandi baru
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#666666]">
              Masukkan kata sandi baru minimal 8 karakter untuk mengamankan akunmu.
            </p>
          </div>

          <ResetPasswordForm />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
