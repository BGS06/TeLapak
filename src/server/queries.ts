import "server-only";
import { cache } from "react";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";
import { DEMO_CAMPUS, DEMO_LISTINGS, DEMO_SELLERS } from "@/server/demo-data";
import type {
  Campus,
  Dispute,
  Enums,
  Listing,
  Order,
  PayoutEntry,
  Profile,
  PublicProfile,
  Report,
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
  ] = await Promise.all([
    supabase.from("listings").select("*").eq("id", order.listing_id).maybeSingle(),
    lookup.from("public_profiles").select("*").eq("id", order.buyer_id).maybeSingle(),
    lookup.from("public_profiles").select("*").eq("id", order.seller_id).maybeSingle(),
    canSeeSellerContact
      ? getSupabaseAdminClient().rpc("get_seller_contact", { p_order_id: order.id })
      : Promise.resolve({ data: null }),
    supabase.from("disputes").select("*").eq("order_id", order.id).maybeSingle(),
    supabase.from("payout_ledger").select("*").eq("order_id", order.id).maybeSingle(),
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
