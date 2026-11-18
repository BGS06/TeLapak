import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/server/email/send";
import {
  confirmationReminder,
  disputeOpened,
  paymentReceivedBuyer,
  paymentReceivedSeller,
  type OrderEmailContext,
} from "@/server/email/templates";
import { serverEnv } from "@/server/env";

interface LoadedOrderContext {
  ctx: OrderEmailContext;
  buyerEmail: string;
  sellerEmail: string;
}

async function loadOrderEmailContext(orderId: string): Promise<LoadedOrderContext | null> {
  const admin = getSupabaseAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: listing }, { data: profiles }] = await Promise.all([
    admin.from("listings").select("*").eq("id", order.listing_id).maybeSingle(),
    admin.from("profiles").select("id, email").in("id", [order.buyer_id, order.seller_id]),
  ]);
  if (!listing) return null;

  const buyerEmail = profiles?.find((p) => p.id === order.buyer_id)?.email ?? "";
  const sellerEmail = profiles?.find((p) => p.id === order.seller_id)?.email ?? "";

  return {
    buyerEmail,
    sellerEmail,
    ctx: {
      orderId: order.id,
      itemTitle: listing.title,
      itemPriceIdr: order.item_price_idr,
      totalPaidIdr: order.total_paid_idr,
      sellerNetIdr: order.seller_net_idr,
      meetingPoint: listing.meeting_point,
      meetingPointNote: listing.meeting_point_note,
      autoReleaseAt: order.auto_release_at,
    },
  };
}

/** Email #1 (PRD §9): Pembayaran diterima → ke Pembeli & Penjual. */
export async function notifyPaymentReceived(orderId: string) {
  const loaded = await loadOrderEmailContext(orderId);
  if (!loaded) return;

  await Promise.all([
    sendEmail({ to: loaded.buyerEmail, ...paymentReceivedBuyer(loaded.ctx) }),
    sendEmail({ to: loaded.sellerEmail, ...paymentReceivedSeller(loaded.ctx) }),
  ]);
}

/** Email #2 (PRD §9): Pengingat konfirmasi H+2 → ke Pembeli. */
export async function notifyConfirmationReminder(orderId: string) {
  const loaded = await loadOrderEmailContext(orderId);
  if (!loaded) return;

  await sendEmail({ to: loaded.buyerEmail, ...confirmationReminder(loaded.ctx) });
}

/** Email #3 (PRD §9): Sengketa dibuka → ke Pembeli, Penjual, & Admin. */
export async function notifyDisputeOpened(orderId: string, reason: string) {
  const loaded = await loadOrderEmailContext(orderId);
  if (!loaded) return;

  const payload = { ...loaded.ctx, reason };
  const tasks = [
    sendEmail({ to: loaded.buyerEmail, ...disputeOpened(payload, "buyer") }),
    sendEmail({ to: loaded.sellerEmail, ...disputeOpened(payload, "seller") }),
  ];
  if (serverEnv.adminNotificationEmail) {
    tasks.push(sendEmail({ to: serverEnv.adminNotificationEmail, ...disputeOpened(payload, "admin") }));
  }
  await Promise.all(tasks);
}
