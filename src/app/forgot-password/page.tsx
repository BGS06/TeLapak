import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-14">
        <div className="rounded-xl border border-[#edf2f2] bg-white p-6 shadow-xs sm:p-7">
          <div className="mb-5">
            <span className="inline-flex rounded-md bg-[#fdf2f2] px-2 py-0.5 text-[11px] font-bold text-[#b3261e]">
              Pemulihan Akun {BUSINESS.productName}
            </span>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#171717]">
              Lupa kata sandi?
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#666666]">
              Masukkan alamat email kampus atau email pribadi yang terdaftar. Kami akan mengirim
              tautan aman untuk mengatur ulang kata sandimu.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
