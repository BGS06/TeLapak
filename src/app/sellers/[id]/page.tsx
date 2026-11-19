import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { USER_TYPE_LABEL } from "@/config/constants";
import { formatDate, initials } from "@/lib/utils";
import { getPublicSellerProfile } from "@/server/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getPublicSellerProfile(id);
  if (!bundle) return { title: "Penjual tidak ditemukan" };
  return {
    title: `Etalase ${bundle.seller.first_name} — ${bundle.campus.name}`,
    description: `Lihat ${bundle.activeListings.length} barang preloved aktif dan ulasan civitas dari ${bundle.seller.first_name} di ${bundle.campus.name}.`,
  };
}

export default async function SellerPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getPublicSellerProfile(id);
  if (!bundle) notFound();

  const { seller, campus, activeListings, soldCount, reviewSummary } = bundle;

  return (
    <>
      <SiteHeader />

      {/* Banner Profil Penjual Publik */}
      <section className="border-b border-[#edf2f2] bg-[#f2f4f4]/60">
        <div className="mx-auto max-w-[1280px] px-4 py-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] transition hover:text-[#b3261e]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Katalog
          </Link>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#b3261e] text-xl font-extrabold tracking-tight text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
                {initials(seller.first_name)}
                {seller.verification_status === "verified" && (
                  <span
                    title="Civitas Kampus Terverifikasi"
                    className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#146c43] text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-[#171717] sm:text-2xl">
                    {seller.first_name}
                  </h1>
                  <Badge tone="neutral">{USER_TYPE_LABEL[seller.user_type]}</Badge>
                  {seller.verification_status === "verified" && (
                    <Badge tone="success">Terverifikasi Kampus</Badge>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666666]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#b3261e]" />
                    <strong className="font-semibold text-[#171717]">{campus.name}</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#8c8c8c]" />
                    Bergabung {formatDate(seller.created_at)}
                  </span>
                </div>

                {/* Statistik Penjual */}
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
                  <span className="inline-flex items-center gap-1">
                    <Store className="h-3.5 w-3.5 text-[#b3261e]" />
                    <strong className="font-semibold text-[#171717]">{activeListings.length}</strong>{" "}
                    barang aktif
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#146c43]" />
                    <strong className="font-semibold text-[#171717]">{soldCount}</strong> terjual
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                    <strong className="font-semibold text-[#171717]">
                      {reviewSummary.totalReviews > 0
                        ? reviewSummary.averageRating.toFixed(1)
                        : "Belum ada"}
                    </strong>{" "}
                    {reviewSummary.totalReviews > 0 && `(${reviewSummary.totalReviews} ulasan)`}
                  </span>
                </div>
              </div>
            </div>

            {reviewSummary.totalReviews > 0 && (
              <div className="flex shrink-0 items-center gap-3 rounded-lg border border-[#f8deb0] bg-[#fef6e6] px-4 py-3">
                <Star className="h-6 w-6 fill-[#f59e0b] text-[#f59e0b]" />
                <div>
                  <p className="tabular-nums text-lg font-extrabold leading-none text-[#92400e]">
                    {reviewSummary.averageRating.toFixed(1)}
                    <span className="text-xs font-semibold"> / 5.0</span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#92400e]">
                    Dari {reviewSummary.totalReviews} transaksi COD selesai
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1280px] flex-1 space-y-10 px-4 pt-6 pb-12">
        {/* Etalase Barang Aktif */}
        <section>
          <div className="flex items-center justify-between border-b border-[#edf2f2] pb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#171717] sm:text-lg">
                Etalase Barang ({activeListings.length})
              </h2>
              <p className="text-xs text-[#666666]">
                Semua barang aktif milik {seller.first_name} yang siap COD di {campus.name}.
              </p>
            </div>
          </div>

          {activeListings.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {activeListings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 px-6 py-12 text-center">
              <Package className="h-8 w-8 text-[#8c8c8c]" />
              <p className="mt-2 text-sm font-semibold text-[#171717]">
                Belum ada barang aktif saat ini
              </p>
              <p className="mt-0.5 text-xs text-[#666666]">
                Semua barang di etalase penjual ini mungkin sudah terjual.
              </p>
            </div>
          )}
        </section>

        {/* Ulasan Pembeli Terverifikasi */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f2] pb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#171717] sm:text-lg">
                Ulasan Pembeli ({reviewSummary.totalReviews})
              </h2>
              <p className="text-xs text-[#666666]">
                Hanya pembeli yang telah menyelesaikan transaksi COD yang dapat menulis ulasan.
              </p>
            </div>
          </div>

          {reviewSummary.reviews.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {reviewSummary.reviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-lg border border-[#edf2f2] bg-white p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f2f4f4] text-[11px] font-bold text-[#171717]">
                        {initials(rev.reviewerFirstName)}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#171717]">{rev.reviewerFirstName}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= rev.rating
                                  ? "fill-[#f59e0b] text-[#f59e0b]"
                                  : "text-[#d9dfdf]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#8c8c8c]">{formatDate(rev.created_at)}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#171717]">“{rev.comment}”</p>
                  <p className="text-[11px] text-[#8c8c8c]">
                    Membeli:{" "}
                    <Link
                      href={`/items/${rev.listing_id}`}
                      className="font-medium text-[#666666] hover:text-[#b3261e] hover:underline"
                    >
                      {rev.listingTitle}
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 p-6 text-center text-xs text-[#666666]">
              Penjual ini belum memiliki ulasan dari pembeli.
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
