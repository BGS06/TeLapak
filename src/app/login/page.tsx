import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next ?? "/";

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-[#e6e0d6] bg-white p-6 shadow-xs space-y-5">
          <div>
            <span className="rounded-full bg-[#fdeceb] px-2.5 py-0.5 text-[11px] font-bold text-[#b3261e]">
              Civitas {BUSINESS.productName}
            </span>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#181512]">
              Masuk untuk jual & beli aman
            </h1>
            <p className="mt-1 text-xs text-[#57524c]">
              Satu akun tunggal untuk membeli maupun memasang barang bekas di kampusmu.
            </p>
          </div>

          {params.error && (
            <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs text-[#991b1b]">
              Sesi verifikasi email tidak valid atau sudah kedaluwarsa. Silakan masuk kembali.
            </div>
          )}

          <LoginForm nextPath={nextPath} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
