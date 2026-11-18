import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyPaymentReceived } from "@/server/order-notifications";
import {
  InvalidWebhookError,
  getPaymentProvider,
  isPaymentProviderName,
} from "@/server/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params;
  if (!isPaymentProviderName(providerParam)) {
    return NextResponse.json({ error: "Provider tidak dikenal" }, { status: 404 });
  }

  const provider = getPaymentProvider(providerParam);

  try {
    const event = await provider.verifyWebhook(request);
    const admin = getSupabaseAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", event.orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    if (event.amountIdr !== null && event.amountIdr < order.total_paid_idr) {
      return NextResponse.json({ error: "Nominal pembayaran tidak sesuai" }, { status: 400 });
    }

    if (event.status === "paid") {
      const { data: outcome, error } = await admin.rpc("mark_order_paid", {
        p_order_id: order.id,
        p_payment_reference: event.reference,
      });

      if (error) {
        console.error("[webhook] Gagal mark_order_paid", error);
        return NextResponse.json({ error: "Gagal memperbarui status pesanan" }, { status: 500 });
      }

      if (outcome === "paid") {
        await notifyPaymentReceived(order.id);
      } else if (outcome === "needs_refund") {
        await provider.processRefund({
          orderId: order.id,
          reference: event.reference,
          amountIdr: order.total_paid_idr,
          reason: "Pembayaran diterima setelah pesanan kedaluwarsa dan barang sudah tidak tersedia.",
        });
        await admin.rpc("mark_late_payment_refunded", { p_order_id: order.id });
      }
    } else if (
      (event.status === "expired" || event.status === "failed") &&
      order.status === "pending_payment"
    ) {
      await admin.rpc("cancel_order", {
        p_order_id: order.id,
        p_actor: order.buyer_id,
      });
    }

    return NextResponse.json({ ok: true, status: event.status });
  } catch (err) {
    if (err instanceof InvalidWebhookError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[webhook] Kesalahan tidak terduga", err);
    return NextResponse.json({ error: "Internal webhook error" }, { status: 500 });
  }
}
