import "server-only";
import { cache } from "react";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";
import { DEMO_CAMPUS, DEMO_LISTINGS, DEMO_SELLERS } from "@/server/demo-data";
import type {
  Campus,
  Conversation,
  Dispute,
  Enums,
  Listing,
  Message,
  Order,
  PayoutEntry,
  Profile,
  PublicProfile,
  Report,
  Review,
} from "@/types/database";

// ---------------------------------------------------------------------
// Kampus (PRD §4)
// ---------------------------------------------------------------------
export const getActiveCampuses = cache(async (): Promise<Campus[]> => {
  if (!isSupabaseConfigured) return [DEMO_CAMPUS];
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("campuses").select("*").eq("is_active", true).order("name");
  return data?.length ? data : [DEMO_CAMPUS];
});

export const getActiveCampusForSession = cache(async (): Promise<Campus> => {
  const campuses = await getActiveCampuses();
  const profile = await getCurrentProfile();
  if (profile) {
    const match = campuses.find((c) => c.id === profile.campus_id);
    if (match) return match;
  }
  return (
    campuses.find((c) => c.slug === publicEnv.defaultCampusSlug) ??
    campuses[0] ??
    DEMO_CAMPUS
  );
});

// ---------------------------------------------------------------------
// Katalog & Detail Barang (PRD §7.1, §7.2)
// ---------------------------------------------------------------------
export interface CatalogFilter {
  campusId: string;
  q?: string;
  category?: Enums<"listing_category">;
  condition?: Enums<"listing_condition">;
}

export async function getCatalogListings(filter: CatalogFilter): Promise<Listing[]> {
  const q = filter.q?.trim();

  if (!isSupabaseConfigured) {
    return DEMO_LISTINGS.filter((item) => {
      if (item.status !== "active") return false;
      if (filter.category && item.category !== filter.category) return false;
      if (filter.condition && item.condition !== filter.condition) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!item.title.toLowerCase().includes(needle) && !item.description.toLowerCase().includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }

  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("listings")
    .select("*")
    .eq("campus_id", filter.campusId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (filter.category) query = query.eq("category", filter.category);
  if (filter.condition) query = query.eq("condition", filter.condition);
  if (q) {
    const safe = q.replace(/[%_,()]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export interface ListingWithSeller {
  listing: Listing;
  seller: PublicProfile;
  campus: Campus;
}

function getProfileLookupClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getSupabaseAdminClient();
  }
  return null;
}

export const getListingById = cache(async (id: string): Promise<ListingWithSeller | null> => {
  if (!isSupabaseConfigured) {
    const listing = DEMO_LISTINGS.find((l) => l.id === id);
    if (!listing) return null;
    const seller = DEMO_SELLERS[listing.seller_id] ?? Object.values(DEMO_SELLERS)[0]!;
    return { listing, seller, campus: DEMO_CAMPUS };
  }

  const supabase = await getSupabaseServerClient();
  const lookup = getProfileLookupClient() ?? supabase;

  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!listing) return null;

  const [{ data: seller }, { data: campus }] = await Promise.all([
    lookup.from("public_profiles").select("*").eq("id", listing.seller_id).maybeSingle(),
    supabase.from("campuses").select("*").eq("id", listing.campus_id).maybeSingle(),
  ]);

  if (!campus) return null;
  const fallbackSeller: PublicProfile = seller ?? {
    id: listing.seller_id,
    campus_id: listing.campus_id,
    first_name: "Civitas",
    user_type: "student",
    verification_status: "verified",
    created_at: listing.created_at,
  };
  return { listing, seller: fallbackSeller, campus };
});

export async function getMyListings(sellerId: string): Promise<Listing[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---------------------------------------------------------------------
// Pesanan & Detail Pesanan (PRD §5, §7.4)
// ---------------------------------------------------------------------
export interface OrderWithListing {
  order: Order;
  listing: Listing;
  counterpart: PublicProfile | null;
}

export async function getMyOrders(userId: string): Promise<{
  purchases: OrderWithListing[];
  sales: OrderWithListing[];
}> {
  if (!isSupabaseConfigured) return { purchases: [], sales: [] };
  const supabase = await getSupabaseServerClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!orders?.length) return { purchases: [], sales: [] };

  const listingIds = Array.from(new Set(orders.map((o) => o.listing_id)));
  const profileIds = Array.from(
    new Set(orders.flatMap((o) => [o.buyer_id, o.seller_id]).filter((id) => id !== userId)),
  );

  const [{ data: listings }, { data: profiles }] = await Promise.all([
    supabase.from("listings").select("*").in("id", listingIds),
    profileIds.length
      ? (getProfileLookupClient() ?? supabase)
          .from("public_profiles")
          .select("*")
          .in("id", profileIds)
      : Promise.resolve({ data: [] as PublicProfile[] }),
  ]);

  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const purchases: OrderWithListing[] = [];
  const sales: OrderWithListing[] = [];

  for (const order of orders) {
    const listing = listingMap.get(order.listing_id);
    if (!listing) continue;
    if (order.buyer_id === userId) {
      purchases.push({
        order,
        listing,
        counterpart: profileMap.get(order.seller_id) ?? null,
      });
    } else {
      sales.push({
        order,
        listing,
        counterpart: profileMap.get(order.buyer_id) ?? null,
      });
    }
  }

  return { purchases, sales };
}

export interface OrderDetailBundle {
  order: Order;
  listing: Listing;
  buyer: PublicProfile | null;
  seller: PublicProfile | null;
  /** Hanya terisi untuk pembeli setelah pembayaran sukses (paid_held, disputed, completed). */
  sellerContact: { full_name: string; whatsapp_number: string | null } | null;
  dispute: (Dispute & { signedEvidenceUrls: string[] }) | null;
  payoutEntry: PayoutEntry | null;
  review: Review | null;
}

export async function getOrderDetail(orderId: string): Promise<OrderDetailBundle | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabaseServerClient();
  const lookup = getProfileLookupClient() ?? supabase;
  const currentProfile = await getCurrentProfile();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const canSeeSellerContact =
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    currentProfile &&
    (currentProfile.id === order.buyer_id || currentProfile.role === "admin") &&
    ["paid_held", "disputed", "completed"].includes(order.status);

  const [
    { data: listing },
    { data: buyer },
    { data: seller },
    { data: contactRows },
    { data: dispute },
    { data: payoutEntry },
    { data: review },
  ] = await Promise.all([
    supabase.from("listings").select("*").eq("id", order.listing_id).maybeSingle(),
    lookup.from("public_profiles").select("*").eq("id", order.buyer_id).maybeSingle(),
    lookup.from("public_profiles").select("*").eq("id", order.seller_id).maybeSingle(),
    canSeeSellerContact
      ? getSupabaseAdminClient().rpc("get_seller_contact", { p_order_id: order.id })
      : Promise.resolve({ data: null }),
    supabase.from("disputes").select("*").eq("order_id", order.id).maybeSingle(),
    supabase.from("payout_ledger").select("*").eq("order_id", order.id).maybeSingle(),
    supabase.from("reviews").select("*").eq("order_id", order.id).maybeSingle(),
  ]);

  if (!listing) return null;

  let signedEvidenceUrls: string[] = [];
  if (dispute?.evidence_urls?.length) {
    const signed = await Promise.all(
      dispute.evidence_urls.map(async (path) => {
        if (path.startsWith("http")) return path;
        const { data } = await supabase.storage.from("dispute-evidence").createSignedUrl(path, 3600);
        return data?.signedUrl ?? null;
      }),
    );
    signedEvidenceUrls = signed.filter((u): u is string => Boolean(u));
  }

  return {
    order,
    listing,
    buyer: buyer ?? null,
    seller: seller ?? null,
    sellerContact: contactRows?.[0] ?? null,
    dispute: dispute ? { ...dispute, signedEvidenceUrls } : null,
    payoutEntry: payoutEntry ?? null,
    review: review ?? null,
  };
}

// ---------------------------------------------------------------------
// Buku Besar Saldo Penjual (PRD §6, §8)
// ---------------------------------------------------------------------
export async function getSellerPayoutSummary(sellerId: string) {
  if (!isSupabaseConfigured) {
    return { pendingReleaseIdr: 0, readyToPayoutIdr: 0, paidOutIdr: 0, entries: [] as PayoutEntry[] };
  }
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("payout_ledger")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  const entries = data ?? [];
  let pendingReleaseIdr = 0;
  let readyToPayoutIdr = 0;
  let paidOutIdr = 0;

  for (const e of entries) {
    if (e.status === "pending_release") pendingReleaseIdr += e.amount_idr;
    else if (e.status === "ready_to_payout") readyToPayoutIdr += e.amount_idr;
    else if (e.status === "paid_out") paidOutIdr += e.amount_idr;
  }

  return { pendingReleaseIdr, readyToPayoutIdr, paidOutIdr, entries };
}

// ---------------------------------------------------------------------
// Panel Admin (PRD §7.5)
// ---------------------------------------------------------------------
export interface AdminVerificationItem {
  profile: Profile;
  campusName: string;
  signedDocUrl: string | null;
}

export interface AdminDisputeItem {
  dispute: Dispute;
  order: Order;
  listing: Listing;
  buyer: Profile | null;
  seller: Profile | null;
  signedEvidenceUrls: string[];
}

export interface AdminPayoutGroup {
  seller: Profile;
  totalReadyIdr: number;
  entryCount: number;
  oldestReadyAt: string;
}

export interface AdminReportItem {
  report: Report;
  reporter: Profile | null;
  targetListing: Listing | null;
  targetUser: Profile | null;
}

export async function getAdminDashboardData() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      verifications: [] as AdminVerificationItem[],
      disputes: [] as AdminDisputeItem[],
      payouts: [] as AdminPayoutGroup[],
      reports: [] as AdminReportItem[],
    };
  }

  const admin = getSupabaseAdminClient();

  const [
    { data: campuses },
    { data: pendingProfiles },
    { data: openDisputes },
    { data: readyLedger },
    { data: openReports },
  ] = await Promise.all([
    admin.from("campuses").select("*"),
    admin
      .from("profiles")
      .select("*")
      .eq("verification_status", "pending")
      .not("verification_doc_url", "is", null)
      .order("created_at", { ascending: true }),
    admin.from("disputes").select("*").eq("resolution", "pending").order("created_at", { ascending: true }),
    admin.from("payout_ledger").select("*").eq("status", "ready_to_payout").order("created_at", { ascending: true }),
    admin.from("reports").select("*").eq("status", "open").order("created_at", { ascending: true }),
  ]);

  const campusMap = new Map((campuses ?? []).map((c) => [c.id, c.name]));

  // 1. Antrean Verifikasi
  const verifications: AdminVerificationItem[] = await Promise.all(
    (pendingProfiles ?? []).map(async (profile) => {
      let signedDocUrl: string | null = null;
      if (profile.verification_doc_url) {
        const { data } = await admin.storage
          .from("verification-docs")
          .createSignedUrl(profile.verification_doc_url, 3600);
        signedDocUrl = data?.signedUrl ?? null;
      }
      return {
        profile,
        campusName: campusMap.get(profile.campus_id) ?? "Kampus",
        signedDocUrl,
      };
    }),
  );

  // 2. Pesanan & Sengketa
  const disputeOrderIds = (openDisputes ?? []).map((d) => d.order_id);
  const { data: disputeOrders } = disputeOrderIds.length
    ? await admin.from("orders").select("*").in("id", disputeOrderIds)
    : { data: [] as Order[] };
  const disputeOrderMap = new Map((disputeOrders ?? []).map((o) => [o.id, o]));

  const relatedListingIds = Array.from(
    new Set([
      ...(disputeOrders ?? []).map((o) => o.listing_id),
      ...(openReports ?? []).map((r) => r.target_listing_id).filter((id): id is string => Boolean(id)),
    ]),
  );
  const { data: relatedListings } = relatedListingIds.length
    ? await admin.from("listings").select("*").in("id", relatedListingIds)
    : { data: [] as Listing[] };
  const listingMap = new Map((relatedListings ?? []).map((l) => [l.id, l]));

  const relatedProfileIds = Array.from(
    new Set([
      ...(disputeOrders ?? []).flatMap((o) => [o.buyer_id, o.seller_id]),
      ...(readyLedger ?? []).map((l) => l.seller_id),
      ...(openReports ?? []).flatMap((r) => [r.reporter_id, r.target_user_id]).filter((id): id is string => Boolean(id)),
      ...(relatedListings ?? []).map((l) => l.seller_id),
    ]),
  );
  const { data: relatedProfiles } = relatedProfileIds.length
    ? await admin.from("profiles").select("*").in("id", relatedProfileIds)
    : { data: [] as Profile[] };
  const profileMap = new Map((relatedProfiles ?? []).map((p) => [p.id, p]));

  const disputes: AdminDisputeItem[] = [];
  for (const dispute of openDisputes ?? []) {
    const order = disputeOrderMap.get(dispute.order_id);
    if (!order) continue;
    const listing = listingMap.get(order.listing_id);
    if (!listing) continue;

    const signed = await Promise.all(
      (dispute.evidence_urls ?? []).map(async (path) => {
        if (path.startsWith("http")) return path;
        const { data } = await admin.storage.from("dispute-evidence").createSignedUrl(path, 3600);
        return data?.signedUrl ?? null;
      }),
    );

    disputes.push({
      dispute,
      order,
      listing,
      buyer: profileMap.get(order.buyer_id) ?? null,
      seller: profileMap.get(order.seller_id) ?? null,
      signedEvidenceUrls: signed.filter((u): u is string => Boolean(u)),
    });
  }

  // 3. Pencairan Dana (agregasi per penjual)
  const payoutGroupMap = new Map<string, AdminPayoutGroup>();
  for (const entry of readyLedger ?? []) {
    const seller = profileMap.get(entry.seller_id);
    if (!seller) continue;
    const existing = payoutGroupMap.get(entry.seller_id);
    if (!existing) {
      payoutGroupMap.set(entry.seller_id, {
        seller,
        totalReadyIdr: entry.amount_idr,
        entryCount: 1,
        oldestReadyAt: entry.created_at,
      });
    } else {
      existing.totalReadyIdr += entry.amount_idr;
      existing.entryCount += 1;
    }
  }
  const payouts = Array.from(payoutGroupMap.values()).sort((a, b) => b.totalReadyIdr - a.totalReadyIdr);

  // 4. Laporan
  const reports: AdminReportItem[] = (openReports ?? []).map((report) => {
    const targetListing = report.target_listing_id ? (listingMap.get(report.target_listing_id) ?? null) : null;
    const targetUserId = report.target_user_id ?? targetListing?.seller_id ?? null;
    return {
      report,
      reporter: profileMap.get(report.reporter_id) ?? null,
      targetListing,
      targetUser: targetUserId ? (profileMap.get(targetUserId) ?? null) : null,
    };
  });

  return { verifications, disputes, payouts, reports };
}

// ---------------------------------------------------------------------
// Chat In-App & Make Offer (Tawar Harga)
// ---------------------------------------------------------------------
export interface ConversationSummaryItem {
  conversation: Conversation;
  listing: Listing;
  counterpart: PublicProfile | null;
  perspective: "buyer" | "seller";
  unreadCount: number;
}

export interface UnreadChatSummary {
  totalUnread: number;
  byConversation: Record<string, number>;
}

export async function getUnreadChatSummary(
  userId: string | undefined,
): Promise<UnreadChatSummary> {
  if (!isSupabaseConfigured || !userId) {
    return { totalUnread: 0, byConversation: {} };
  }
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_unread_counts");
    if (error || !data) {
      return { totalUnread: 0, byConversation: {} };
    }
    const byConversation: Record<string, number> = {};
    let totalUnread = 0;
    for (const row of data) {
      const count = Number(row.unread_count) || 0;
      if (count > 0) {
        byConversation[row.conversation_id] = count;
        totalUnread += count;
      }
    }
    return { totalUnread, byConversation };
  } catch {
    return { totalUnread: 0, byConversation: {} };
  }
}

export async function markConversationReadServer(
  conversationId: string,
  isBuyer: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const admin = getSupabaseAdminClient();
    const { data: latestMsg } = await admin
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const readTs = latestMsg?.created_at ?? new Date().toISOString();
    await admin
      .from("conversations")
      .update(isBuyer ? { buyer_last_read_at: readTs } : { seller_last_read_at: readTs })
      .eq("id", conversationId);
  } catch (err) {
    console.error("[markConversationReadServer] Error:", err);
  }
}

export async function getBuyerOfferForListing(
  listingId: string,
  buyerId: string | undefined,
): Promise<{ conversationId: string; acceptedOfferIdr: number | null } | null> {
  if (!isSupabaseConfigured || !buyerId) return null;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, accepted_offer_idr")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (!data) return null;
  return { conversationId: data.id, acceptedOfferIdr: data.accepted_offer_idr };
}

export async function getMyConversations(userId: string): Promise<ConversationSummaryItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabaseServerClient();
  const lookup = getProfileLookupClient() ?? supabase;

  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (!convs?.length) return [];

  const listingIds = Array.from(new Set(convs.map((c) => c.listing_id)));
  const profileIds = Array.from(
    new Set(convs.flatMap((c) => [c.buyer_id, c.seller_id]).filter((id) => id !== userId)),
  );

  const [{ data: listings }, { data: profiles }, unreadSummary] = await Promise.all([
    supabase.from("listings").select("*").in("id", listingIds),
    profileIds.length
      ? lookup.from("public_profiles").select("*").in("id", profileIds)
      : Promise.resolve({ data: [] as PublicProfile[] }),
    getUnreadChatSummary(userId),
  ]);

  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const items: ConversationSummaryItem[] = [];
  for (const conv of convs) {
    const listing = listingMap.get(conv.listing_id);
    if (!listing) continue;
    const isBuyer = conv.buyer_id === userId;
    items.push({
      conversation: conv,
      listing,
      counterpart: profileMap.get(isBuyer ? conv.seller_id : conv.buyer_id) ?? null,
      perspective: isBuyer ? "buyer" : "seller",
      unreadCount: unreadSummary.byConversation[conv.id] ?? 0,
    });
  }
  return items;
}

export interface ConversationDetailBundle {
  conversation: Conversation;
  listing: Listing;
  buyer: PublicProfile | null;
  seller: PublicProfile | null;
  messages: Message[];
}

export async function getConversationDetail(
  conversationId: string,
): Promise<ConversationDetailBundle | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabaseServerClient();
  const lookup = getProfileLookupClient() ?? supabase;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return null;

  const [{ data: listing }, { data: buyer }, { data: seller }, { data: messages }] =
    await Promise.all([
      supabase.from("listings").select("*").eq("id", conversation.listing_id).maybeSingle(),
      lookup.from("public_profiles").select("*").eq("id", conversation.buyer_id).maybeSingle(),
      lookup.from("public_profiles").select("*").eq("id", conversation.seller_id).maybeSingle(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true }),
    ]);

  if (!listing) return null;

  return {
    conversation,
    listing,
    buyer: buyer ?? null,
    seller: seller ?? null,
    messages: messages ?? [],
  };
}

// ---------------------------------------------------------------------
// Rating & Review Bintang 1-5
// ---------------------------------------------------------------------
export interface EnrichedReview extends Review {
  reviewerFirstName: string;
  listingTitle: string;
}

export interface SellerReviewSummary {
  averageRating: number;
  totalReviews: number;
  reviews: EnrichedReview[];
}

export async function getSellerReviewSummary(sellerId: string): Promise<SellerReviewSummary> {
  if (!isSupabaseConfigured) {
    return { averageRating: 0, totalReviews: 0, reviews: [] };
  }

  const supabase = await getSupabaseServerClient();
  const lookup = getProfileLookupClient() ?? supabase;

  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!rawReviews?.length) {
    return { averageRating: 0, totalReviews: 0, reviews: [] };
  }

  const reviewerIds = Array.from(new Set(rawReviews.map((r) => r.reviewer_id)));
  const listingIds = Array.from(new Set(rawReviews.map((r) => r.listing_id)));

  const [{ data: profiles }, { data: listings }] = await Promise.all([
    reviewerIds.length
      ? lookup.from("public_profiles").select("*").in("id", reviewerIds)
      : Promise.resolve({ data: [] as PublicProfile[] }),
    listingIds.length
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.first_name]));
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l.title]));

  const sum = rawReviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / rawReviews.length) * 10) / 10;

  const reviews: EnrichedReview[] = rawReviews.map((r) => ({
    ...r,
    reviewerFirstName: profileMap.get(r.reviewer_id) ?? "Civitas",
    listingTitle: listingMap.get(r.listing_id) ?? "Barang Kampus",
  }));

  return {
    averageRating,
    totalReviews: rawReviews.length,
    reviews,
  };
}

