import type { Metadata } from "next";
import { RegisterForm } from "@/app/register/register-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveCampuses } from "@/server/queries";

export const metadata: Metadata = {
  title: "Daftar Akun Civitas",
};

export default async function RegisterPage() {
  const campuses = await getActiveCampuses();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-[#e6e0d6] bg-white p-6 shadow-xs space-y-5">
          <div>
            <span className="rounded-full bg-[#e8f5ee] px-2.5 py-0.5 text-[11px] font-bold text-[#146c43]">
              Verifikasi Civitas 2 Tingkat
            </span>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight text-[#181512]">
              Daftar Akun Baru
            </h1>
            <p className="mt-1 text-xs text-[#57524c]">
              Komunitas tertutup khusus mahasiswa, dosen, dan alumni Telkom University.
            </p>
          </div>

          <RegisterForm campuses={campuses} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
