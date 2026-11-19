import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { ChatRoomClient } from "@/app/messages/[id]/chat-room-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { USER_TYPE_LABEL } from "@/config/constants";
import { requireProfile } from "@/server/auth";
import { getConversationDetail, markConversationReadServer } from "@/server/queries";

export const metadata: Metadata = {
  title: "Ruang Chat & Negosiasi",
};

export default async function ConversationRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, bundle] = await Promise.all([
    requireProfile(`/messages/${id}`),
    getConversationDetail(id),
  ]);

  if (!bundle) notFound();
  const { conversation, listing, buyer, seller, messages } = bundle;

  const isBuyer = conversation.buyer_id === profile.id;
  const isSeller = conversation.seller_id === profile.id;
  if (!isBuyer && !isSeller && profile.role !== "admin") notFound();

  if (isBuyer || isSeller) {
    await markConversationReadServer(conversation.id, isBuyer);
  }

  const counterpart = isBuyer ? seller : buyer;
  const counterpartName = counterpart?.first_name ?? "Civitas";

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-3.5 pt-4 pb-12 sm:px-4 sm:pt-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#171717]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Semua Pesan
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#171717]">{counterpartName}</span>
            {counterpart && (
              <Badge tone="neutral">{USER_TYPE_LABEL[counterpart.user_type]}</Badge>
            )}
            {counterpart?.verification_status === "verified" && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#146c43]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Terverifikasi
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[#666666]">
              <MapPin className="h-3.5 w-3.5 text-[#b3261e]" />
              {listing.meeting_point}
            </span>
          </div>
        </div>

        <ChatRoomClient
          conversationId={conversation.id}
          currentUserId={profile.id}
          isBuyer={isBuyer}
          isBuyerVerified={profile.verification_status === "verified" && !profile.is_suspended}
          listing={listing}
          acceptedOfferIdr={conversation.accepted_offer_idr}
          messages={messages}
          counterpartName={counterpartName}
        />
      </main>

      <SiteFooter />
    </>
  );
}
