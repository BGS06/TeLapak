import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  FileCheck2,
  Flag,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  DisputeResolutionControls,
  PayoutTransferControls,
  ReportModerationControls,
  VerificationDecisionControls,
} from "@/app/admin/admin-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { BUSINESS } from "@/config/business";
import { USER_TYPE_LABEL, payoutMethodLabel } from "@/config/constants";
import { formatDateTime, formatIDR, formatWhatsApp, orderCode } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { getAdminDashboardData } from "@/server/queries";

export const metadata: Metadata = {
  title: "Panel Admin",
};

type AdminTab = "verifikasi" | "sengketa" | "payout" | "laporan";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const [params, data] = await Promise.all([searchParams, getAdminDashboardData()]);

  const activeTab: AdminTab =
    params.tab === "sengketa" || params.tab === "payout" || params.tab === "laporan"
      ? params.tab
      : "verifikasi";

  const tabs: { key: AdminTab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      key: "verifikasi",
      label: "Antrean Verifikasi",
      count: data.verifications.length,
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      key: "sengketa",
      label: "Pesanan & Sengketa",
      count: data.disputes.length,
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      key: "payout",
      label: "Pencairan Dana (Payout)",
      count: data.payouts.length,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      key: "laporan",
      label: "Laporan Barang",
      count: data.reports.length,
      icon: <Flag className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#b3261e]" />
              <h1 className="text-xl font-extrabold tracking-tight text-[#181512] sm:text-2xl">
                Panel Moderasi & Operasional Admin
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-[#57524c]">
              Verifikasi civitas alumni/dosen, putus sengketa transaksi, kelola pencairan dana
              penjual, dan moderasi laporan komunitas.
            </p>
          </div>
        </div>

        {/* Navigasi 4 Tab Panel Admin (PRD §7.5) */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#e6e0d6] pb-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/admin?tab=${tab.key}`}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  active
                    ? "bg-[#181512] text-white"
                    : "border border-[#e6e0d6] bg-white text-[#57524c] hover:bg-[#f3efe9]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-[#f3efe9] text-[#181512]"
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* TAB 1: ANTREAN VERIFIKASI ALUMNI / DOSEN */}
        {activeTab === "verifikasi" && (
          <section className="space-y-3">
            {data.verifications.length > 0 ? (
              data.verifications.map(({ profile, campusName, signedDocUrl }) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#181512]">{profile.full_name}</h3>
                        <Badge tone="info">{USER_TYPE_LABEL[profile.user_type]}</Badge>
                        <Badge tone="neutral">{campusName}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[#57524c]">
                        Email: <strong>{profile.email}</strong> • Daftar:{" "}
                        {formatDateTime(profile.created_at)}
                      </p>
                    </div>

                    {signedDocUrl && (
                      <a
                        href={signedDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6e0d6] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#b3261e] hover:bg-[#f3efe9]"
                      >
                        Buka Foto Bukti Penuh
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {signedDocUrl && (
                    <div className="max-h-72 overflow-hidden rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signedDocUrl}
                        alt={`Bukti identitas ${profile.full_name}`}
                        className="mx-auto max-h-64 object-contain"
                      />
                    </div>
                  )}

                  <VerificationDecisionControls userId={profile.id} />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcd5c9] bg-white p-10 text-center text-xs text-[#57524c]">
                Tidak ada antrean verifikasi manual alumni/dosen saat ini.
              </div>
            )}
          </section>
        )}

        {/* TAB 2: PESANAN & SENGKETA */}
        {activeTab === "sengketa" && (
          <section className="space-y-4">
            {data.disputes.length > 0 ? (
              data.disputes.map(({ dispute, order, listing, buyer, seller, signedEvidenceUrls }) => (
                <div
                  key={dispute.id}
                  className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#b3261e]">
                        #{orderCode(order.id)}
                      </span>
                      <h3 className="text-base font-bold text-[#181512]">{listing.title}</h3>
                    </div>
                    <span className="text-xs text-[#857e76]">
                      Dibuka: {formatDateTime(dispute.created_at)}
                    </span>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5 text-xs sm:grid-cols-2">
                    <div>
                      <p className="font-bold text-[#181512]">
                        Pembeli: {buyer?.full_name ?? "-"}
                      </p>
                      <p className="text-[#57524c]">{buyer?.email ?? "-"}</p>
                      {buyer?.whatsapp_number && (
                        <p className="font-mono text-[#146c43]">
                          {formatWhatsApp(buyer.whatsapp_number)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#181512]">
                        Penjual: {seller?.full_name ?? "-"}
                      </p>
                      <p className="text-[#57524c]">{seller?.email ?? "-"}</p>
                      {seller?.whatsapp_number && (
                        <p className="font-mono text-[#146c43]">
                          {formatWhatsApp(seller.whatsapp_number)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#991b1b]">Alasan Sengketa:</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-[#181512]">
                      {dispute.reason}
                    </p>
                  </div>

                  {signedEvidenceUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {signedEvidenceUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square overflow-hidden rounded-xl border border-[#e6e0d6] bg-[#faf8f5]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Bukti ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <DisputeResolutionControls
                    orderId={order.id}
                    buyerPaidIdr={order.total_paid_idr}
                    sellerNetIdr={order.seller_net_idr}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcd5c9] bg-white p-10 text-center text-xs text-[#57524c]">
                Tidak ada pesanan bersengketa saat ini.
              </div>
            )}
          </section>
        )}

        {/* TAB 3: PENCAIRAN DANA (PAYOUT) */}
        {activeTab === "payout" && (
          <section className="space-y-3">
            {data.payouts.length > 0 ? (
              data.payouts.map(({ seller, totalReadyIdr, entryCount }) => {
                const meetsMin = totalReadyIdr >= BUSINESS.minPayoutIdr;
                return (
                  <div
                    key={seller.id}
                    className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#181512]">{seller.full_name}</h3>
                          <Badge tone={meetsMin ? "success" : "warning"}>
                            {entryCount} pesanan selesai
                          </Badge>
                          {!meetsMin && (
                            <span className="text-[11px] text-[#92400e]">
                              (Di bawah batas min. {formatIDR(BUSINESS.minPayoutIdr)})
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#57524c]">
                          Tujuan Transfer:{" "}
                          <strong className="text-[#181512]">
                            {payoutMethodLabel(seller.payout_method)}
                          </strong>{" "}
                          •{" "}
                          <span className="font-mono font-bold text-[#181512]">
                            {seller.payout_account_number ?? "-"}
                          </span>{" "}
                          a.n.{" "}
                          <strong className="text-[#181512]">
                            {seller.payout_account_name ?? "-"}
                          </strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="block text-[11px] text-[#857e76]">
                          Total Siap Ditransfer
                        </span>
                        <span className="tabular-nums text-xl font-extrabold text-[#146c43]">
                          {formatIDR(totalReadyIdr)}
                        </span>
                      </div>
                    </div>

                    <PayoutTransferControls
                      sellerId={seller.id}
                      totalReadyIdr={totalReadyIdr}
                    />
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcd5c9] bg-white p-10 text-center text-xs text-[#57524c]">
                Belum ada saldo penjual berstatus <code>ready_to_payout</code>.
              </div>
            )}
          </section>
        )}

        {/* TAB 4: LAPORAN BARANG PALSU / TERLARANG */}
        {activeTab === "laporan" && (
          <section className="space-y-3">
            {data.reports.length > 0 ? (
              data.reports.map(({ report, reporter, targetListing, targetUser }) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      {targetListing ? (
                        <Link
                          href={`/items/${targetListing.id}`}
                          className="text-base font-bold text-[#181512] hover:text-[#b3261e]"
                        >
                          {targetListing.title} ({formatIDR(targetListing.price_idr)})
                        </Link>
                      ) : (
                        <h3 className="text-base font-bold text-[#181512]">
                          Laporan Pengguna: {targetUser?.full_name ?? "-"}
                        </h3>
                      )}
                      <p className="mt-0.5 text-xs text-[#57524c]">
                        Terlapor: <strong>{targetUser?.full_name ?? "-"}</strong> (
                        {targetUser?.email ?? "-"}) • Pelapor:{" "}
                        <strong>{reporter?.full_name ?? "-"}</strong>
                      </p>
                    </div>
                    <span className="text-xs text-[#857e76]">
                      {formatDateTime(report.created_at)}
                    </span>
                  </div>

                  <p className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3 text-xs text-[#181512]">
                    “{report.reason}”
                  </p>

                  <ReportModerationControls
                    reportId={report.id}
                    hasListing={Boolean(targetListing)}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcd5c9] bg-white p-10 text-center text-xs text-[#57524c]">
                Tidak ada laporan terbuka saat ini.
              </div>
            )}
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
