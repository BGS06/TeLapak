import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Edit3,
  LogOut,
  Plus,
  ShieldAlert,
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
import { formatDateTime, formatIDR, orderCode } from "@/lib/utils";
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
        <main className="mx-auto max-w-xl flex-1 px-4 py-12">
          <div className="rounded-2xl border border-[#f8deb0] bg-[#fef6e6] p-6 text-xs text-[#92400e]">
            Hubungkan Supabase di <code className="rounded bg-[#fbe9c6] px-1 py-0.5">.env.local</code>{" "}
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

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 space-y-6">
        {/* Header Profil */}
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e6e0d6] bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-[#181512] sm:text-xl">
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
            <p className="mt-1 text-xs text-[#57524c]">
              {profile.email} • {campus.name}
            </p>
          </div>

          <form action={signOutAction}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </form>
        </section>

        {/* Tingkat 1: Upload Bukti Identitas bila belum verified */}
        {profile.verification_status !== "verified" && (
          <VerificationDocUploader profile={profile} />
        )}

        {/* Buku Besar Saldo Penjual (payout_ledger, PRD §6 & §8) */}
        <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#b3261e]" />
              <h2 className="text-base font-bold text-[#181512]">
                Buku Besar Pencairan Dana Penjual
              </h2>
            </div>
            <span className="text-xs text-[#857e76]">
              Minimum pencairan rutin: <strong>{formatIDR(BUSINESS.minPayoutIdr)}</strong>
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5">
              <span className="text-xs text-[#57524c]">Dana Ditahan Sementara</span>
              <p className="mt-1 tabular-nums text-lg font-extrabold text-[#1e40af]">
                {formatIDR(payoutSummary.pendingReleaseIdr)}
              </p>
              <span className="text-[11px] text-[#857e76]">Menunggu barang diterima pembeli</span>
            </div>

            <div className="rounded-xl border border-[#bfe3ce] bg-[#e8f5ee]/60 p-3.5">
              <span className="text-xs font-semibold text-[#146c43]">Siap Dicairkan Admin</span>
              <p className="mt-1 tabular-nums text-lg font-extrabold text-[#146c43]">
                {formatIDR(payoutSummary.readyToPayoutIdr)}
              </p>
              <span className="text-[11px] text-[#3d3833]">
                Ditransfer ke rekening pencairanmu
              </span>
            </div>

            <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5">
              <span className="text-xs text-[#57524c]">Total Sudah Ditransfer</span>
              <p className="mt-1 tabular-nums text-lg font-extrabold text-[#181512]">
                {formatIDR(payoutSummary.paidOutIdr)}
              </p>
              <span className="text-[11px] text-[#857e76]">Akumulasi penjualan selesai</span>
            </div>
          </div>

          {payoutSummary.entries.length > 0 && (
            <div className="overflow-x-auto border-t border-[#e6e0d6] pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e6e0d6] text-[#857e76]">
                    <th className="py-2 pr-3">Pesanan</th>
                    <th className="py-2 pr-3">Nominal Bersih</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Referensi Transfer</th>
                    <th className="py-2">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3efe9]">
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
                      <td className="py-2.5 pr-3 tabular-nums font-bold text-[#181512]">
                        {formatIDR(entry.amount_idr)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={PAYOUT_STATUS[entry.status].tone}>
                          {PAYOUT_STATUS[entry.status].label}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[#57524c]">
                        {entry.transfer_reference ?? "-"}
                      </td>
                      <td className="py-2.5 text-[#857e76]">
                        {formatDateTime(entry.paid_at ?? entry.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tingkat 2: Form WhatsApp & Rekening Pencairan */}
        <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#181512]">
                Kontak WhatsApp & Rekening Pencairan (Tingkat 2)
              </h2>
              <p className="text-xs text-[#57524c]">
                Wajib dilengkapi sebelum memasang barang pertamamu.
              </p>
            </div>
            {readiness.ready ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-3 py-1 text-xs font-bold text-[#146c43]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Siap Menjual Barang
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fef6e6] px-3 py-1 text-xs font-bold text-[#92400e]">
                <ShieldAlert className="h-3.5 w-3.5" />
                Belum Lengkap
              </span>
            )}
          </div>

          <SellerProfileForm profile={profile} />
        </section>

        {/* Daftar Barang yang Dipasang Pengguna */}
        <section className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#181512]">
                Barang yang Kamu Pasang ({myListings.length})
              </h2>
              <p className="text-xs text-[#57524c]">
                Kelola ketersediaan atau perbarui detail barangmu.
              </p>
            </div>
            <Button asChild variant="primary" size="sm">
              <Link href="/sell">
                <Plus className="h-4 w-4" />
                Pasang Barang
              </Link>
            </Button>
          </div>

          {myListings.length > 0 ? (
            <div className="divide-y divide-[#f3efe9]">
              {myListings.map((item) => {
                const statusMeta = LISTING_STATUS[item.status];
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#e6e0d6] bg-[#f3efe9]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_urls[0] ?? ""}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          <span className="tabular-nums text-xs font-extrabold text-[#181512]">
                            {formatIDR(item.price_idr)}
                          </span>
                        </div>
                        <Link
                          href={`/items/${item.id}`}
                          className="mt-0.5 block truncate text-sm font-bold text-[#181512] hover:text-[#b3261e]"
                        >
                          {item.title}
                        </Link>
                        <span className="text-xs text-[#857e76]">
                          Titik temu: {item.meeting_point}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/items/${item.id}`}>Lihat</Link>
                      </Button>
                      {(item.status === "active" || item.status === "removed") &&
                        !item.taken_down_at && (
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/items/${item.id}/edit`}>
                              <Edit3 className="h-3.5 w-3.5" />
                              Ubah
                            </Link>
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#dcd5c9] bg-[#faf8f5] p-6 text-center text-xs text-[#57524c]">
              Kamu belum memasang barang apa pun.
            </p>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
