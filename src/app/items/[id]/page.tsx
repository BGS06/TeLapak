import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight, MapPin, ShieldCheck, Star } from "lucide-react";
import { ImageGallery, ItemActions } from "@/app/items/[id]/item-detail-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BUSINESS, calculateFees } from "@/config/business";
import { USER_TYPE_LABEL, categoryLabel, conditionOf } from "@/config/constants";
import { publicEnv } from "@/lib/env";
import { formatDate, formatIDR, formatRelative, initials } from "@/lib/utils";
import { getCurrentProfile } from "@/server/auth";
import {
  getBuyerOfferForListing,
  getListingById,
  getSellerReviewSummary,
} from "@/server/queries";

/**
 * OpenGraph metadata wajib (PRD §7.2):
 * og:title, og:description, og:image, og:url agar pratinjau tautan
 * tampil rapi dan meyakinkan saat dibagikan ke grup WhatsApp.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getListingById(id);
  if (!bundle) {
    return { title: "Barang tidak ditemukan" };
  }

  const { listing, campus } = bundle;
  const condition = conditionOf(listing.condition);
  const priceText = formatIDR(listing.price_idr);
  const ogTitle = `${listing.title} — ${priceText}`;
  const ogDescription = `${condition?.label ?? "Bekas"} • COD ${listing.meeting_point} (${campus.name}). ${listing.description.slice(0, 140)}`;
  const ogUrl = `${publicEnv.siteUrl}/items/${listing.id}`;
  const firstImage = listing.image_urls[0];
  const ogImages =
    firstImage && firstImage.startsWith("http")
      ? [{ url: firstImage, width: 800, height: 800, alt: listing.title }]
      : [{ url: `${publicEnv.siteUrl}/icon?size=512`, width: 512, height: 512, alt: listing.title }];

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      type: "website",
      siteName: BUSINESS.productName,
      title: ogTitle,
      description: ogDescription,
      url: ogUrl,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
    },
  };
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bundle, profile] = await Promise.all([getListingById(id), getCurrentProfile()]);
  if (!bundle) notFound();

  const { listing, seller, campus } = bundle;
  const [buyerOffer, sellerReviews] = await Promise.all([
    getBuyerOfferForListing(listing.id, profile?.id),
    getSellerReviewSummary(listing.seller_id),
  ]);

  const condition = conditionOf(listing.condition);
  const effectivePrice = buyerOffer?.acceptedOfferIdr ?? listing.price_idr;
  const fees = calculateFees(effectivePrice);
  const shareUrl = `${publicEnv.siteUrl}/items/${listing.id}`;
  const isOwnListing = profile?.id === listing.seller_id;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-4 pb-12">
        {/* Breadcrumb Navigasi ala Vinted */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-1.5 overflow-x-auto text-xs text-[#8c8c8c] whitespace-nowrap"
        >
          <Link href="/" className="transition-colors hover:text-[#b3261e]">
            Beranda
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/?category=${listing.category}`}
            className="transition-colors hover:text-[#b3261e]"
          >
            {categoryLabel(listing.category)}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-[#666666]">{listing.title}</span>
        </nav>

        {/* Layout 2 Kolom Asimetris Vinted (7 Kolom Galeri : 5 Kolom Sidebar) */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Kolom Kiri: Galeri Foto & Ulasan Pembeli */}
          <div className="space-y-6 lg:col-span-7">
            <ImageGallery images={listing.image_urls} title={listing.title} />

            {/* Daftar Rating & Review Bintang 1-5 untuk Penjual */}
            <section className="rounded-lg border border-[#edf2f2] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f2] pb-3.5">
                <div>
                  <h2 className="text-sm font-bold text-[#171717]">
                    Rating & Ulasan Penjual ({sellerReviews.totalReviews})
                  </h2>
                  <p className="text-xs text-[#666666]">
                    Ulasan terverifikasi dari pembeli civitas kampus yang telah menyelesaikan
                    transaksi.
                  </p>
                </div>
                {sellerReviews.totalReviews > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[#fef6e6] px-2.5 py-1 text-xs font-extrabold text-[#92400e]">
                    <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                    <span className="tabular-nums">{sellerReviews.averageRating.toFixed(1)}</span>
                    <span className="font-normal text-[#8c8c8c]">/ 5.0</span>
                  </div>
                )}
              </div>

              {sellerReviews.reviews.length > 0 ? (
                <div className="mt-3 divide-y divide-[#edf2f2]">
                  {sellerReviews.reviews.slice(0, 5).map((rev) => (
                    <div key={rev.id} className="py-3 first:pt-1 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#171717]">
                            {rev.reviewerFirstName}
                          </span>
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`Rating ${rev.rating} dari 5 bintang`}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < rev.rating
                                    ? "fill-[#f59e0b] text-[#f59e0b]"
                                    : "text-[#d9dfdf]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[11px] text-[#8c8c8c]">
                          {formatDate(rev.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#666666]">“{rev.comment}”</p>
                      <p className="mt-1 text-[11px] text-[#8c8c8c]">
                        Membeli: <span className="font-medium text-[#666666]">{rev.listingTitle}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#8c8c8c]">
                  Penjual ini belum memiliki ulasan transaksi.
                </p>
              )}
            </section>
          </div>

          {/* Kolom Kanan: Sidebar Sticky Harga, Spesifikasi, Aksi, & Penjual */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:col-span-5">
            {/* Kartu Utama Detail Barang */}
            <div className="rounded-lg border border-[#edf2f2] bg-white p-5">
              {/* Harga & Indikator Perlindungan Pembeli */}
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="tabular-nums text-2xl font-extrabold tracking-tight text-[#171717] sm:text-3xl">
                    {formatIDR(effectivePrice)}
                  </p>
                  {buyerOffer?.acceptedOfferIdr && (
                    <span className="tabular-nums text-sm line-through text-[#8c8c8c]">
                      {formatIDR(listing.price_idr)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#b3261e]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Total {formatIDR(fees.totalPaid)} termasuk Perlindungan Transaksi
                  </span>
                </div>
              </div>

              {/* Tabel Spesifikasi 2 Kolom Khas Vinted */}
              <dl className="mt-4 grid grid-cols-2 gap-y-2.5 border-y border-[#edf2f2] py-4 text-xs">
                <dt className="text-[#8c8c8c]">Kategori</dt>
                <dd className="font-semibold text-[#171717]">
                  {categoryLabel(listing.category)}
                </dd>

                <dt className="text-[#8c8c8c]">Kondisi</dt>
                <dd className="font-semibold text-[#171717]">
                  {condition?.label ?? condition?.badge ?? "Bekas"}
                </dd>

                <dt className="text-[#8c8c8c]">Titik COD</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-[#171717]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#b3261e]" />
                  <span>{listing.meeting_point}</span>
                </dd>

                <dt className="text-[#8c8c8c]">Kampus</dt>
                <dd className="font-medium text-[#666666]">{campus.name}</dd>

                <dt className="text-[#8c8c8c]">Diunggah</dt>
                <dd className="font-medium text-[#666666]">
                  {formatRelative(listing.created_at)}
                </dd>
              </dl>

              {/* Judul & Deskripsi Barang */}
              <div className="pt-4">
                <h1 className="text-base font-bold leading-snug text-[#171717] sm:text-lg">
                  {listing.title}
                </h1>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#666666]">
                  {listing.description}
                </p>

                {listing.meeting_point_note && (
                  <div className="mt-3 rounded-md bg-[#f2f4f4] px-3 py-2.5 text-xs text-[#666666]">
                    <span className="font-semibold text-[#171717]">Catatan titik temu: </span>
                    “{listing.meeting_point_note}”
                  </div>
                )}
              </div>

              {/* Tombol Aksi Utama (Beli / Tawar Harga / Chat / Bagikan / Laporkan) */}
              <div className="mt-5 border-t border-[#edf2f2] pt-4">
                <ItemActions
                  listing={listing}
                  conditionLabel={condition?.label ?? "Bekas"}
                  campusName={campus.name}
                  shareUrl={shareUrl}
                  isLoggedIn={Boolean(profile)}
                  isOwnListing={isOwnListing}
                  isBuyerVerified={
                    profile?.verification_status === "verified" && !profile?.is_suspended
                  }
                  totalWithGatewayIdr={fees.totalPaid}
                  gatewayFeeIdr={fees.gatewayFee}
                  acceptedOfferIdr={buyerOffer?.acceptedOfferIdr ?? null}
                  existingConversationId={buyerOffer?.conversationId ?? null}
                />
              </div>
            </div>

            {/* Kartu Profil Penjual + Rating Bintang (Klik untuk lihat etalase publik) */}
            <Link
              href={`/sellers/${seller.id}`}
              className="group flex items-center justify-between rounded-lg border border-[#edf2f2] bg-white p-4 transition hover:border-[#b3261e]/40 hover:bg-[#fdf2f2]/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f4f4] text-sm font-bold text-[#171717] transition group-hover:bg-[#b3261e] group-hover:text-white">
                  {initials(seller.first_name)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-[#171717] group-hover:text-[#b3261e]">
                      {seller.first_name}
                    </span>
                    <span className="rounded bg-[#f2f4f4] px-1.5 py-0.5 text-[11px] font-medium text-[#666666]">
                      {USER_TYPE_LABEL[seller.user_type]}
                    </span>
                    {sellerReviews.totalReviews > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#fef6e6] px-1.5 py-0.5 text-[11px] font-bold text-[#92400e]">
                        <Star className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
                        {sellerReviews.averageRating.toFixed(1)} ({sellerReviews.totalReviews})
                      </span>
                    )}
                  </div>
                  {seller.verification_status === "verified" && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#146c43]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Civitas Terverifikasi
                    </p>
                  )}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#b3261e]">
                Lihat Etalase
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            {/* Info Perlindungan Transaksi Ringkas */}
            <div className="flex items-start gap-2.5 rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/70 p-3.5 text-xs text-[#666666]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b3261e]" />
              <p className="leading-relaxed">
                <strong className="font-semibold text-[#171717]">Perlindungan Transaksi:</strong>{" "}
                Dana ditahan sementara hingga kamu mengecek barang secara langsung di{" "}
                <strong className="font-medium text-[#171717]">{listing.meeting_point}</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
