"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS } from "@/config/business";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatIDR } from "@/lib/utils";
import { getCurrentProfile } from "@/server/auth";
import { fail, mapDbError, ok, type ActionResult } from "@/server/errors";

/**
 * Membuka (atau membuat bila belum ada) ruang chat antara pembeli dan penjual untuk suatu barang.
 */
export async function startOrOpenConversationAction(
  listingId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu untuk mengirim pesan.");
    if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");

    const admin = getSupabaseAdminClient();
    const { data: listing } = await admin
      .from("listings")
      .select("id, campus_id, seller_id, title")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) return fail("Barang tidak ditemukan.");
    if (listing.seller_id === profile.id) {
      return fail("Ini adalah barang milikmu sendiri.");
    }

    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", profile.id)
      .maybeSingle();

    if (existing) {
      return ok({ conversationId: existing.id });
    }

    const { data: created, error } = await admin
      .from("conversations")
      .insert({
        campus_id: listing.campus_id,
        listing_id: listing.id,
        buyer_id: profile.id,
        seller_id: listing.seller_id,
        buyer_last_read_at: new Date().toISOString(),
        seller_last_read_at: "1970-01-01T00:00:00.000Z",
        last_message_text: `Memulai diskusi untuk “${listing.title.slice(0, 40)}”`,
      })
      .select("id")
      .single();

    if (error || !created) return fail(mapDbError(error));

    revalidatePath("/messages");
    return ok({ conversationId: created.id });
  } catch (err) {
    console.error("[startOrOpenConversationAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal membuka ruang chat.");
  }
}

/**
 * Mengirim pesan teks di dalam ruang chat.
 */
export async function sendChatMessageAction(input: {
  conversationId: string;
  body: string;
}): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");
    if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");

    const text = input.body.trim();
    if (!text) return fail("Pesan tidak boleh kosong.");
    if (text.length > 1000) return fail("Pesan maksimal 1.000 karakter.");

    const admin = getSupabaseAdminClient();
    const { data: conv } = await admin
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", input.conversationId)
      .maybeSingle();

    if (!conv) return fail("Ruang chat tidak ditemukan.");
    if (conv.buyer_id !== profile.id && conv.seller_id !== profile.id) {
      return fail("Kamu bukan peserta dalam ruang chat ini.");
    }

    const { data: insertedMsg, error } = await admin
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: profile.id,
        message_type: "text",
        body: text,
      })
      .select("created_at")
      .single();

    if (error) return fail(mapDbError(error));

    const msgTs = insertedMsg?.created_at ?? new Date().toISOString();
    await admin
      .from("conversations")
      .update({
        last_message_text: text.slice(0, 120),
        last_message_at: msgTs,
        ...(profile.id === conv.buyer_id
          ? { buyer_last_read_at: msgTs }
          : { seller_last_read_at: msgTs }),
      })
      .eq("id", conv.id);

    revalidatePath("/messages");
    revalidatePath(`/messages/${conv.id}`);
    return ok(undefined);
  } catch (err) {
    console.error("[sendChatMessageAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal mengirim pesan.");
  }
}

/**
 * Mengajukan tawaran harga (Make Offer) atau Counter Offer.
 * Dapat dipanggil dari halaman detail barang (`listingId`) maupun langsung dari ruang chat (`conversationId`).
 */
export async function sendOfferAction(input: {
  listingId?: string;
  conversationId?: string;
  offerAmountIdr: number;
  note?: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu untuk menawar harga.");
    if (profile.is_suspended) return fail("Akunmu sedang ditangguhkan.");

    const amount = Math.round(Number(input.offerAmountIdr));
    if (!Number.isFinite(amount) || amount < BUSINESS.minListingPriceIdr) {
      return fail(`Tawaran minimal ${formatIDR(BUSINESS.minListingPriceIdr)}.`);
    }

    const admin = getSupabaseAdminClient();
    let conversationId = input.conversationId;

    if (!conversationId) {
      if (!input.listingId) return fail("Barang tidak valid.");
      const started = await startOrOpenConversationAction(input.listingId);
      if (!started.ok) return started;
      conversationId = started.data.conversationId;
    }

    const { data: conv } = await admin
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv) return fail("Ruang chat tidak ditemukan.");
    if (conv.buyer_id !== profile.id && conv.seller_id !== profile.id) {
      return fail("Kamu tidak memiliki akses ke ruang chat ini.");
    }

    const { data: listing } = await admin
      .from("listings")
      .select("id, price_idr, status, title")
      .eq("id", conv.listing_id)
      .maybeSingle();

    if (!listing) return fail("Barang tidak ditemukan.");
    if (listing.status !== "active") {
      return fail("Barang ini sedang dipesan atau sudah terjual sehingga tidak dapat ditawar.");
    }

    const minAllowed = Math.max(BUSINESS.minListingPriceIdr, Math.floor(listing.price_idr * 0.4));
    if (amount < minAllowed) {
      return fail(`Tawaran terlalu rendah. Minimal tawaran untuk barang ini adalah ${formatIDR(minAllowed)}.`);
    }
    if (amount >= listing.price_idr) {
      return fail(`Masukkan nominal tawaran di bawah harga asli (${formatIDR(listing.price_idr)}).`);
    }

    // Batalkan tawaran pending sebelumnya di ruang chat ini menjadi 'superseded'
    await admin
      .from("messages")
      .update({ offer_status: "superseded" })
      .eq("conversation_id", conv.id)
      .eq("message_type", "offer")
      .eq("offer_status", "pending");

    const cleanNote = input.note?.trim();
    const isSellerCounter = profile.id === conv.seller_id;
    const bodyText = cleanNote
      ? cleanNote.slice(0, 300)
      : isSellerCounter
        ? `Mengajukan harga balik (Counter Offer) sebesar ${formatIDR(amount)}`
        : `Menawar barang ini dengan harga ${formatIDR(amount)}`;

    const { data: insertedOffer, error } = await admin
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: profile.id,
        message_type: "offer",
        body: bodyText,
        offer_amount_idr: amount,
        offer_status: "pending",
      })
      .select("created_at")
      .single();

    if (error) return fail(mapDbError(error));

    const offerTs = insertedOffer?.created_at ?? new Date().toISOString();
    await admin
      .from("conversations")
      .update({
        last_message_text: `Tawaran Harga: ${formatIDR(amount)}`,
        last_message_at: offerTs,
        ...(profile.id === conv.buyer_id
          ? { buyer_last_read_at: offerTs }
          : { seller_last_read_at: offerTs }),
      })
      .eq("id", conv.id);

    revalidatePath("/messages");
    revalidatePath(`/messages/${conv.id}`);
    revalidatePath(`/items/${listing.id}`);
    return ok({ conversationId: conv.id }, `Tawaran ${formatIDR(amount)} berhasil dikirim!`);
  } catch (err) {
    console.error("[sendOfferAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal mengirim tawaran harga.");
  }
}

/**
 * Menerima atau menolak tawaran harga (Make Offer / Counter Offer).
 * Saat diterima (`accepted`), harga kesepakatan disimpan di `conversations.accepted_offer_idr`
 * sehingga pembeli langsung dapat checkout dengan harga tersebut.
 */
export async function respondToOfferAction(input: {
  messageId: string;
  decision: "accepted" | "rejected";
}): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return fail("Supabase belum dikonfigurasi.");

    const profile = await getCurrentProfile();
    if (!profile) return fail("Silakan masuk terlebih dahulu.");

    const admin = getSupabaseAdminClient();
    const { data: msg } = await admin
      .from("messages")
      .select("*")
      .eq("id", input.messageId)
      .maybeSingle();

    if (!msg || msg.message_type !== "offer" || !msg.offer_amount_idr) {
      return fail("Data tawaran tidak ditemukan.");
    }
    if (msg.offer_status !== "pending") {
      return fail("Tawaran ini sudah diproses atau digantikan tawaran baru.");
    }
    if (msg.sender_id === profile.id) {
      return fail("Kamu tidak bisa menyetujui tawaran yang kamu ajukan sendiri.");
    }

    const { data: conv } = await admin
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id")
      .eq("id", msg.conversation_id)
      .maybeSingle();

    if (!conv) return fail("Ruang chat tidak ditemukan.");
    if (conv.buyer_id !== profile.id && conv.seller_id !== profile.id) {
      return fail("Kamu tidak memiliki akses ke ruang chat ini.");
    }

    const { error: updateErr } = await admin
      .from("messages")
      .update({ offer_status: input.decision })
      .eq("id", msg.id);

    if (updateErr) return fail(mapDbError(updateErr));

    const formattedPrice = formatIDR(msg.offer_amount_idr);
    const systemBody =
      input.decision === "accepted"
        ? `Tawaran ${formattedPrice} disetujui! Pembeli kini dapat menekan “Beli Sekarang” dengan harga kesepakatan ${formattedPrice}.`
        : `Tawaran ${formattedPrice} belum disetujui. Silakan ajukan nominal lain atau diskusikan di chat.`;

    const { data: insertedSys } = await admin
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: profile.id,
        message_type: "system",
        body: systemBody,
      })
      .select("created_at")
      .single();

    const sysTs = insertedSys?.created_at ?? new Date().toISOString();
    await admin
      .from("conversations")
      .update({
        ...(input.decision === "accepted" ? { accepted_offer_idr: msg.offer_amount_idr } : {}),
        last_message_text:
          input.decision === "accepted"
            ? `Kesepakatan Harga: ${formattedPrice}`
            : `Tawaran ${formattedPrice} ditolak`,
        last_message_at: sysTs,
        ...(profile.id === conv.buyer_id
          ? { buyer_last_read_at: sysTs }
          : { seller_last_read_at: sysTs }),
      })
      .eq("id", conv.id);

    revalidatePath("/messages");
    revalidatePath(`/messages/${conv.id}`);
    revalidatePath(`/items/${conv.listing_id}`);
    return ok(
      undefined,
      input.decision === "accepted"
        ? `Tawaran ${formattedPrice} disetujui! Pembeli dapat langsung checkout dengan harga ini.`
        : "Tawaran telah ditolak.",
    );
  } catch (err) {
    console.error("[respondToOfferAction] Error:", err);
    return fail(err instanceof Error ? err.message : "Gagal memproses tawaran.");
  }
}

/**
 * Menandai seluruh pesan masuk di ruang chat sebagai sudah dibaca oleh pengguna saat ini.
 */
export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured) return ok(undefined);

    const profile = await getCurrentProfile();
    if (!profile) return ok(undefined);

    const admin = getSupabaseAdminClient();
    const { data: conv } = await admin
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv) return ok(undefined);
    if (conv.buyer_id !== profile.id && conv.seller_id !== profile.id) {
      return ok(undefined);
    }

    const { data: latestMsg } = await admin
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const readTs = latestMsg?.created_at ?? new Date().toISOString();
    await admin
      .from("conversations")
      .update(
        conv.buyer_id === profile.id
          ? { buyer_last_read_at: readTs }
          : { seller_last_read_at: readTs },
      )
      .eq("id", conv.id);

    revalidatePath("/messages");
    return ok(undefined);
  } catch (err) {
    console.error("[markConversationReadAction] Error:", err);
    return fail("Gagal memperbarui status baca pesan.");
  }
}
