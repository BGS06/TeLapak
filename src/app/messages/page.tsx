import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageSquare, Tag } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LISTING_STATUS } from "@/config/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { formatIDR, formatRelative, initials } from "@/lib/utils";
import { requireProfile } from "@/server/auth";
import { getMyConversations } from "@/server/queries";

export const metadata: Metadata = {
  title: "Pesan & Negosiasi Harga",
};

export default async function MessagesInboxPage() {
  if (!isSupabaseConfigured) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl flex-1 px-4 py-12">
          <div className="rounded-lg border border-[#edf2f2] bg-[#f2f4f4]/70 p-6 text-xs text-[#666666]">
            Hubungkan Supabase untuk menggunakan fitur Chat & Tawar Harga.
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const profile = await requireProfile("/messages");
  const conversations = await getMyConversations(profile.id);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-3.5 pt-5 pb-12 sm:px-4 sm:pt-6">
        <div className="border-b border-[#edf2f2] pb-4">
          <h1 className="text-xl font-extrabold tracking-tight text-[#171717] sm:text-2xl">
            Pesan & Tawar Harga
          </h1>
          <p className="mt-1 text-xs text-[#666666]">
            Diskusikan detail barang, ajukan tawaran harga (Make Offer), dan sepakati titik temu COD
            dengan civitas kampus.
          </p>
        </div>

        {conversations.length > 0 ? (
          <div className="mt-4 divide-y divide-[#edf2f2] overflow-hidden rounded-lg border border-[#edf2f2] bg-white">
            {conversations.map(({ conversation, listing, counterpart, perspective }) => {
              const cover = listing.image_urls[0] ?? "";
              const listingStatus = LISTING_STATUS[listing.status];
              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="group flex items-center justify-between gap-3.5 p-3.5 transition hover:bg-[#f2f4f4]/60 active:scale-[0.995] sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    {/* Foto Barang */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#edf2f2] bg-[#f2f4f4] sm:h-16 sm:w-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#b3261e] text-[10px] font-bold text-white">
                          {initials(counterpart?.first_name ?? "C")}
                        </span>
                        <span className="text-xs font-bold text-[#171717]">
                          {counterpart?.first_name ?? "Civitas"}
                        </span>
                        <Badge tone="neutral" className="text-[10px]">
                          {perspective === "buyer" ? "Penjual" : "Calon Pembeli"}
                        </Badge>
                        <Badge tone={listingStatus.tone} className="text-[10px]">
                          {listingStatus.label}
                        </Badge>
                        {conversation.accepted_offer_idr && (
                          <Badge tone="success" className="text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Deal {formatIDR(conversation.accepted_offer_idr)}
                          </Badge>
                        )}
                      </div>

                      <h3 className="mt-1 truncate text-xs font-semibold text-[#171717] group-hover:text-[#b3261e] sm:text-sm">
                        {listing.title}
                      </h3>

                      <p className="mt-0.5 truncate text-xs text-[#666666]">
                        {conversation.last_message_text || "Mulai percakapan..."}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[11px] text-[#8c8c8c]">
                      {formatRelative(conversation.last_message_at)}
                    </span>
                    <span className="tabular-nums text-xs font-extrabold text-[#171717]">
                      {formatIDR(conversation.accepted_offer_idr ?? listing.price_idr)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#b3261e]">
                      Buka
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-[#d9dfdf] bg-[#f2f4f4]/50 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8c8c8c] shadow-2xs">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-base font-bold text-[#171717]">
              Belum ada percakapan atau tawaran harga
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#666666]">
              Buka halaman barang yang kamu minati lalu tekan tombol{" "}
              <strong className="text-[#171717]">“Tawar Harga”</strong> atau{" "}
              <strong className="text-[#171717]">“Chat Penjual”</strong>.
            </p>
            <Button asChild variant="primary" size="sm" className="mt-5">
              <Link href="/">
                <Tag className="h-4 w-4" />
                Jelajahi Katalog Barang
              </Link>
            </Button>
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
