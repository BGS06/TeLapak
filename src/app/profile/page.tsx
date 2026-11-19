import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Edit3,
  ExternalLink,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldAlert,
  Store,
  Wallet,
} from "lucide-react";
import {
  SellerProfileForm,
  VerificationDocUploader,
} from "@/app/profile/profile-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/config/business";
import {
  LISTING_STATUS,
  PAYOUT_STATUS,
  USER_TYPE_LABEL,
  VERIFICATION_LABEL,
} from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime, formatIDR, initials, orderCode } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";
import { requireProfile, sellerReadiness } from "@/server/auth";
import {
  getActiveCampusForSession,
  getMyListings,
  getSellerPayoutSummary,
} from "@/server/queries";

export const metadata: Metadata = {
  title: "Profil & Pencairan Dana",
};

export default async function ProfilePage() {
  if (!isSupabaseConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
          <div className="rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/70 p-6 text-xs text-[#666666]">
            Hubungkan Supabase di{" "}
            <code className="rounded border border-[#d9dfdf] bg-white px-1.5 py-0.5 text-[#b3261e]">
              .env.local
            </code>{" "}
            untuk mengelola profil dan pencairan dana.
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const [profile, campus] = await Promise.all([
    requireProfile("/profile"),
    getActiveCampusForSession(),
  ]);

  const [myListings, payoutSummary] = await Promise.all([
    getMyListings(profile.id),
    getSellerPayoutSummary(profile.id),
  ]);

  const readiness = sellerReadiness(profile);
  const activeListingsCount = myListings.filter((item) => item.status === "active").length;

  return (
    <>
      <SiteHeader />

      {/* Banner Header Profil Member ala Vinted — Responsif di Mobile, Tablet, & Desktop */}
      <section className="border-b border-[#edf2f2] bg-[#f2f4f4]/60">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-4 px-3.5 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-4 sm:py-6">
          <div className="flex items-start gap-3.5 sm:items-center sm:gap-4">
            {/* Avatar Lingkaran Besar + Lencana Verifikasi */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#b3261e] text-lg font-extrabold tracking-tight text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
              {initials(profile.full_name)}
              {profile.verification_status === "verified" && (
                <span
                  title="Civitas Kampus Terverifikasi"
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#146c43] text-white sm:h-6 sm:w-6"
                >
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg font-extrabold leading-tight tracking-tight text-[#171717] sm:text-2xl">
                  {profile.full_name}
                </h1>
                <Badge tone="neutral">{USER_TYPE_LABEL[profile.user_type]}</Badge>
                <Badge
                  tone={
                    profile.verification_status === "verified"
                      ? "success"
                      : profile.verification_status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {VERIFICATION_LABEL[profile.verification_status]}
                </Badge>
                {profile.role === "admin" && <Badge tone="brand">Admin</Badge>}
              </div>

              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#666666]">
                <span className="break-all">{profile.email}</span>
                <span aria-hidden="true">·</span>
                <strong className="font-semibold text-[#171717]">{campus.name}</strong>
              </p>

              {/* Statistik Singkat Member */}
              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[#666666] sm:mt-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-[#b3261e]" />
                  <strong className="font-semibold text-[#171717]">{activeListingsCount}</strong>{" "}
                  barang aktif
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-[#8c8c8c]" />
                  <strong className="font-semibold text-[#171717]">{myListings.length}</strong>{" "}
                  total etalase
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Kanan (Full-width 2 kolom di layar HP, auto-width di tablet/desktop) */}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:gap-2.5">
            <Button asChild variant="primary" size="sm" className="h-9 w-full sm:w-auto">
              <Link href="/sell">
                <Plus className="h-4 w-4" />
                Pasang Barang
              </Link>
            </Button>
            <form action={signOutAction} className="w-full sm:w-auto">
              <Button type="submit" variant="secondary" size="sm" className="h-9 w-full sm:w-auto">
                <LogOut className="h-4 w-4" />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Konten Utama 2 Kolom Asimetris (4 Kolom Sidebar Kiri : 8 Kolom Area Utama Kanan) */}
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3.5 pt-5 pb-12 sm:px-4 sm:pt-6">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-12 lg:items-start">
          {/* === KOLOM KIRI: Saldo Penjual & Checklist Kelengkapan === */}
          <aside className="space-y-4 sm:space-y-5 lg:sticky lg:top-28 lg:col-span-4">
            {/* Widget Saldo ala Vinted Balance */}
            <section className="overflow-hidden rounded-lg border border-[#edf2f2] bg-white">
              <div className="flex items-center justify-between border-b border-[#edf2f2] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#b3261e]" />
                  <h2 className="text-sm font-bold text-[#171717]">Saldo Penjual</h2>
                </div>
                <span className="text-[11px] text-[#8c8c8c]">
                  Min. cair{" "}
                  <strong className="text-[#171717]">{formatIDR(BUSINESS.minPayoutIdr)}</strong>
                </span>
              </div>

              {/* Sorotan Utama: Siap Dicairkan */}
              <div className="bg-[#fdf2f2]/60 px-4 py-4">
                <span className="text-xs font-medium text-[#666666]">Siap Dicairkan Admin</span>
                <p className="tabular-nums mt-0.5 text-2xl font-extrabold tracking-tight text-[#b3261e]">
                  {formatIDR(payoutSummary.readyToPayoutIdr)}
                </p>
                <p className="mt-1 text-[11px] text-[#666666]">
                  Ditransfer ke rekening pencairan yang terdaftar
                </p>
              </div>

              {/* Rincian Dana Ditahan & Sudah Ditransfer */}
              <div className="grid grid-cols-2 divide-x divide-[#edf2f2] border-t border-[#edf2f2]">
                <div className="p-3.5">
                  <span className="block text-[11px] text-[#8c8c8c]">Dana Ditahan Sementara</span>
                  <p className="tabular-nums mt-1 text-sm font-extrabold text-[#171717]">
                    {formatIDR(payoutSummary.pendingReleaseIdr)}
                  </p>
                  <span className="mt-0.5 block text-[10px] leading-tight text-[#8c8c8c]">
                    Menunggu konfirmasi pembeli
                  </span>
                </div>

                <div className="p-3.5">
                  <span className="block text-[11px] text-[#8c8c8c]">Sudah Ditransfer</span>
                  <p className="tabular-nums mt-1 text-sm font-extrabold text-[#146c43]">
                    {formatIDR(payoutSummary.paidOutIdr)}
                  </p>
                  <span className="mt-0.5 block text-[10px] leading-tight text-[#8c8c8c]">
                    Total penjualan selesai
                  </span>
                </div>
              </div>
            </section>

            {/* Kartu Status Kesiapan Menjual (Tingkat 2) */}
            <section className="rounded-lg border border-[#edf2f2] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#171717]">Status Penjual</h2>
                {readiness.ready ? (
                  <Badge tone="success">Siap Jualan</Badge>
                ) : (
                  <Badge tone="warning">Belum Lengkap</Badge>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#666666]">
                Lengkapi 3 syarat berikut agar kamu bisa memasang barang di katalog kampus:
              </p>

              <ul className="mt-3.5 space-y-2.5 border-t border-[#edf2f2] pt-3.5 text-xs">
                <li className="flex items-center gap-2.5">
                  {readiness.verified ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#146c43]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[#8c8c8c]" />
                  )}
                  <span
                    className={
                      readiness.verified ? "font-semibold text-[#171717]" : "text-[#666666]"
                    }
                  >
                    Verifikasi Civitas Kampus
                  </span>
                </li>

                <li className="flex items-center gap-2.5">
                  {readiness.whatsapp ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#146c43]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[#8c8c8c]" />
                  )}
                  <span
                    className={
                      readiness.whatsapp ? "font-semibold text-[#171717]" : "text-[#666666]"
                    }
                  >
                    Nomor WhatsApp Aktif
                  </span>
                </li>

                <li className="flex items-center gap-2.5">
                  {readiness.payout ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#146c43]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-[#8c8c8c]" />
                  )}
                  <span
                    className={
                      readiness.payout ? "font-semibold text-[#171717]" : "text-[#666666]"
                    }
                  >
                    Rekening / E-Wallet Pencairan
                  </span>
                </li>
              </ul>
            </section>
          </aside>

          {/* === KOLOM KANAN: Etalase Barang, Form Penjual, & Mutasi === */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-8">
            {/* Tingkat 1: Upload Bukti Identitas bila belum verified */}
            {profile.verification_status !== "verified" && (
              <VerificationDocUploader profile={profile} />
            )}

            {/* Etalase Barang yang Kamu Pasang (Grid 2 kolom di Mobile, 3 kolom di Tablet/Desktop ala Vinted Wardrobe) */}
            <section className="rounded-lg border border-[#edf2f2] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f2] pb-3.5 sm:pb-4">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-[#171717]">
                    Etalase Barangmu ({myListings.length})
                  </h2>
                  <p className="mt-0.5 text-xs text-[#666666]">
                    Kelola ketersediaan atau perbarui detail barang yang kamu jual.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/sell">
                    <Plus className="h-4 w-4" />
                    Tambah Barang
                  </Link>
                </Button>
              </div>

              {myListings.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {myListings.map((item) => {
                    const statusMeta = LISTING_STATUS[item.status];
                    const cover = item.image_urls[0] ?? "";
                    return (
                      <div
                        key={item.id}
                        className="group flex flex-col overflow-hidden rounded-lg border border-[#edf2f2] bg-white transition hover:border-[#d9dfdf]"
                      >
                        {/* Foto Rasio 3:4 */}
                        <Link
                          href={`/items/${item.id}`}
                          className="relative aspect-[3/4] w-full overflow-hidden bg-[#f2f4f4]"
                        >
                          {cover ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={cover}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-medium text-[#8c8c8c]">
                              Tanpa Foto
                            </div>
                          )}

                          <div className="absolute left-2 top-2">
                            <Badge tone={statusMeta.tone} className="text-[10px] sm:text-xs">
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </Link>

                        {/* Detail & Tombol Cepat */}
                        <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
                          <div>
                            <p className="tabular-nums text-xs font-extrabold text-[#171717] sm:text-sm">
                              {formatIDR(item.price_idr)}
                            </p>
                            <Link
                              href={`/items/${item.id}`}
                              className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#666666] transition-colors hover:text-[#b3261e]"
                            >
                              {item.title}
                            </Link>
                            <p className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] text-[#8c8c8c]">
                              <MapPin className="h-3 w-3 shrink-0 text-[#b3261e]" />
                              <span className="truncate">{item.meeting_point}</span>
                            </p>
                          </div>

                          <div className="mt-2.5 grid grid-cols-2 gap-1.5 border-t border-[#edf2f2] pt-2 sm:mt-3 sm:pt-2.5">
                            <Button asChild variant="secondary" size="sm" className="px-2">
                              <Link href={`/items/${item.id}`}>
                                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span>Lihat</span>
                              </Link>
                            </Button>
                            {(item.status === "active" || item.status === "removed") &&
                            !item.taken_down_at ? (
                              <Button asChild variant="secondary" size="sm" className="px-2">
                                <Link href={`/items/${item.id}/edit`}>
                                  <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  <span>Ubah</span>
                                </Link>
                              </Button>
                            ) : (
                              <span className="inline-flex h-8 items-center justify-center rounded-md bg-[#f2f4f4] text-[11px] font-medium text-[#8c8c8c]">
                                Terkunci
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 px-4 py-10 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#8c8c8c] shadow-2xs">
                    <Store className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#171717]">
                    Etalasemu masih kosong
                  </h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#666666]">
                    Punya buku kuliah, kalkulator, atau parfum jarang terpakai? Pasang sekarang dan
                    tawarkan COD ke sesama mahasiswa.
                  </p>
                  <Button asChild variant="primary" size="sm" className="mt-4">
                    <Link href="/sell">
                      <Plus className="h-4 w-4" />
                      Pasang Barang Pertama
                    </Link>
                  </Button>
                </div>
              )}
            </section>

            {/* Tingkat 2: Form WhatsApp & Rekening Pencairan */}
            <section className="rounded-lg border border-[#edf2f2] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f2] pb-3.5 sm:pb-4">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight text-[#171717]">
                    Kontak WhatsApp & Rekening Pencairan
                  </h2>
                  <p className="mt-0.5 text-xs text-[#666666]">
                    Wajib dilengkapi sebelum memasang barang pertamamu (Tingkat 2).
                  </p>
                </div>
                {readiness.ready ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f5ee] px-2.5 py-1 text-xs font-semibold text-[#146c43]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Siap Menjual Barang
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#fdf2f2] px-2.5 py-1 text-xs font-semibold text-[#b3261e]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Belum Lengkap
                  </span>
                )}
              </div>

              <div className="mt-4">
                <SellerProfileForm profile={profile} />
              </div>
            </section>

            {/* Riwayat Buku Besar Pencairan (tampil bila sudah ada transaksi) */}
            {payoutSummary.entries.length > 0 && (
              <section className="rounded-lg border border-[#edf2f2] bg-white p-4 sm:p-5">
                <div className="border-b border-[#edf2f2] pb-3.5">
                  <h2 className="text-base font-extrabold tracking-tight text-[#171717]">
                    Riwayat Mutasi Pencairan
                  </h2>
                  <p className="mt-0.5 text-xs text-[#666666]">
                    Catatan dana masuk dari transaksi selesai dan pencairan ke rekeningmu.
                  </p>
                </div>

                {/* Tampilan Kartu Mobile (< sm) — bebas scroll horizontal di Android & iOS */}
                <div className="mt-3 space-y-2.5 sm:hidden">
                  {payoutSummary.entries.slice(0, 10).map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/orders/${entry.order_id}`}
                      className="block rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/60 p-3 text-xs transition active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#b3261e]">
                          {orderCode(entry.order_id)}
                        </span>
                        <Badge tone={PAYOUT_STATUS[entry.status].tone}>
                          {PAYOUT_STATUS[entry.status].label}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        <span className="tabular-nums text-sm font-extrabold text-[#171717]">
                          {formatIDR(entry.amount_idr)}
                        </span>
                        <span className="text-[11px] text-[#8c8c8c]">
                          {formatDateTime(entry.paid_at ?? entry.created_at)}
                        </span>
                      </div>
                      {entry.transfer_reference && (
                        <p className="mt-1 truncate font-mono text-[11px] text-[#666666]">
                          Ref: {entry.transfer_reference}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Tampilan Tabel Desktop (>= sm) */}
                <div className="mt-3 hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#edf2f2] text-[#8c8c8c]">
                        <th className="py-2.5 pr-3 font-semibold">Pesanan</th>
                        <th className="py-2.5 pr-3 font-semibold">Nominal Bersih</th>
                        <th className="py-2.5 pr-3 font-semibold">Status</th>
                        <th className="py-2.5 pr-3 font-semibold">Referensi Transfer</th>
                        <th className="py-2.5 font-semibold">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2f2]">
                      {payoutSummary.entries.slice(0, 10).map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-2.5 pr-3 font-mono font-bold">
                            <Link
                              href={`/orders/${entry.order_id}`}
                              className="text-[#b3261e] hover:underline"
                            >
                              {orderCode(entry.order_id)}
                            </Link>
                          </td>
                          <td className="tabular-nums py-2.5 pr-3 font-bold text-[#171717]">
                            {formatIDR(entry.amount_idr)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge tone={PAYOUT_STATUS[entry.status].tone}>
                              {PAYOUT_STATUS[entry.status].label}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-[#666666]">
                            {entry.transfer_reference ?? "-"}
                          </td>
                          <td className="py-2.5 text-[#8c8c8c]">
                            {formatDateTime(entry.paid_at ?? entry.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
