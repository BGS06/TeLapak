import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/listing-form";
import { ListingOwnerControls } from "@/components/listing-owner-controls";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireProfile } from "@/server/auth";
import { getListingById } from "@/server/queries";

export const metadata: Metadata = {
  title: "Ubah Barang",
};

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, bundle] = await Promise.all([
    requireProfile(`/items/${id}/edit`),
    getListingById(id),
  ]);

  if (!bundle) notFound();
  const { listing, campus } = bundle;

  if (listing.seller_id !== profile.id) {
    redirect(`/items/${listing.id}`);
  }

  const isLocked =
    (listing.status !== "active" && listing.status !== "removed") || Boolean(listing.taken_down_at);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6">
        <div className="mb-4">
          <Link
            href={`/items/${listing.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57524c] hover:text-[#181512]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke detail barang
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-extrabold tracking-tight text-[#181512] sm:text-2xl">
            Ubah Barang
          </h1>
          <p className="mt-1 text-xs text-[#57524c]">
            Perbarui foto, harga, titik temu, atau deskripsi barangmu.
          </p>
        </div>

        {isLocked ? (
          <div className="rounded-2xl border border-[#f8deb0] bg-[#fef6e6] p-5 text-xs text-[#92400e]">
            Barang yang sedang dalam proses pemesanan, sudah terjual, atau diturunkan oleh admin
            tidak dapat diubah.
          </div>
        ) : (
          <>
            <ListingForm
              userId={profile.id}
              campusName={campus.name}
              meetingPoints={campus.meeting_points}
              initialListing={listing}
            />
            <ListingOwnerControls
              listingId={listing.id}
              status={listing.status}
              redirectAfterDelete="/profile"
            />
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
