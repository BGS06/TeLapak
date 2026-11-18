import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Tag } from "lucide-react";
import { ImageGallery, ItemActions } from "@/app/items/[id]/item-detail-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { BUSINESS, calculateFees } from "@/config/business";
import { USER_TYPE_LABEL, categoryLabel, conditionOf } from "@/config/constants";
import { publicEnv } from "@/lib/env";
import { formatIDR, formatRelative, initials } from "@/lib/utils";
import { getCurrentProfile } from "@/server/auth";
import { getListingById } from "@/server/queries";

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
  const condition = conditionOf(listing.condition);
  const fees = calculateFees(listing.price_idr);
  const shareUrl = `${publicEnv.siteUrl}/items/${listing.id}`;
  const isOwnListing = profile?.id === listing.seller_id;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57524c] hover:text-[#181512]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke katalog {campus.name}
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-12 md:items-start">
          {/* Kolom Kiri: Galeri Foto 1:1 */}
          <div className="md:col-span-6">
            <ImageGallery images={listing.image_urls} title={listing.title} />
          </div>

          {/* Kolom Kanan: Detail, Penjual, & Aksi */}
          <div className="space-y-5 md:col-span-6">
            <div className="rounded-2xl border border-[#e6e0d6] bg-white p-5 space-y-4">
              {/* Badge Kategori & Kondisi */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  <Tag className="h-3 w-3" />
                  {categoryLabel(listing.category)}
                </Badge>
                {condition && (
                  <Badge tone={listing.condition === "like_new" ? "success" : "info"}>
                    {condition.badge}
                  </Badge>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#857e76]">
                  <Clock className="h-3 w-3" />
                  {formatRelative(listing.created_at)}
                </span>
              </div>

              {/* Judul & Harga */}
              <div>
                <h1 className="text-lg font-extrabold leading-snug tracking-tight text-[#181512] sm:text-xl">
                  {listing.title}
                </h1>
                <p className="mt-2 tabular-nums text-2xl font-extrabold tracking-tight text-[#b3261e] sm:text-3xl">
                  {formatIDR(listing.price_idr)}
                </p>
              </div>

              {/* Lokasi Titik Temu Kampus */}
              <div className="rounded-xl border border-[#e6e0d6] bg-[#faf8f5] p-3.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b3261e]" />
                  <div className="text-xs">
                    <p className="font-bold text-[#181512]">
                      Titik Temu: {listing.meeting_point}
                    </p>
                    <p className="text-[#57524c]">{campus.name}</p>
                    {listing.meeting_point_note && (
                      <p className="mt-1 text-[#3d3833]">
                        Catatan penjual: “{listing.meeting_point_note}”
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Deskripsi Lengkap */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#857e76]">
                  Deskripsi Barang
                </h2>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#3d3833]">
                  {listing.description}
                </p>
              </div>

              {/* Info Penjual (Nama Depan + Status Verifikasi Kampus, PRD §7.2) */}
              <div className="flex items-center justify-between border-t border-[#e6e0d6] pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3efe9] text-sm font-bold text-[#181512]">
                    {initials(seller.first_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#181512]">{seller.first_name}</span>
                      <span className="text-xs text-[#57524c]">
                        • {USER_TYPE_LABEL[seller.user_type]}
                      </span>
                    </div>
                    {seller.verification_status === "verified" && (
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-[#146c43]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Civitas Terverifikasi
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#857e76]">
                  WhatsApp dibuka setelah bayar
                </span>
              </div>
            </div>

            {/* Tombol Beli / Bagikan ke WhatsApp / Laporkan */}
            <ItemActions
              listing={listing}
              conditionLabel={condition?.label ?? "Bekas"}
              campusName={campus.name}
              shareUrl={shareUrl}
              isLoggedIn={Boolean(profile)}
              isOwnListing={isOwnListing}
              isBuyerVerified={profile?.verification_status === "verified" && !profile?.is_suspended}
              totalWithGatewayIdr={fees.totalPaid}
              gatewayFeeIdr={fees.gatewayFee}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
