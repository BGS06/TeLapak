import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";
import {
  InvalidWebhookError,
  PaymentProviderError,
  type CreateInvoiceInput,
  type Invoice,
  type PaymentEvent,
  type PaymentEventStatus,
  type PaymentProvider,
  type RefundInput,
} from "./types";

/**
 * Midtrans Snap — QRIS & e-wallet (GoPay, ShopeePay).
 * Docs: https://docs.midtrans.com/reference/snap-api
 */
export class MidtransProvider implements PaymentProvider {
  readonly name = "midtrans" as const;

  private get snapBase() {
    return serverEnv.midtransIsProduction
      ? "https://app.midtrans.com/snap/v1"
      : "https://app.sandbox.midtrans.com/snap/v1";
  }

  private get coreBase() {
    return serverEnv.midtransIsProduction ? "https://api.midtrans.com/v2" : "https://api.sandbox.midtrans.com/v2";
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${serverEnv.midtransServerKey}:`).toString("base64")}`;
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.authHeader,
        ...init.headers,
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || body === null) {
      throw new PaymentProviderError(`Midtrans ${res.status} pada ${url}`, body);
    }
    return body;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const items = [
      { id: "item", price: input.itemPriceIdr, quantity: 1, name: input.itemName.slice(0, 50) },
    ];
    if (input.serviceFeeIdr > 0) {
      items.push({ id: "service-fee", price: input.serviceFeeIdr, quantity: 1, name: "Biaya layanan pembayaran" });
    }

    const body = await this.request<{ token: string; redirect_url: string }>(`${this.snapBase}/transactions`, {
      method: "POST",
      body: JSON.stringify({
        transaction_details: { order_id: input.orderId, gross_amount: input.amountIdr },
        item_details: items,
        customer_details: { first_name: input.customer.name.slice(0, 50), email: input.customer.email },
        enabled_payments: ["other_qris", "gopay", "shopeepay"],
        expiry: { unit: "minutes", duration: input.expiresInMinutes },
        callbacks: { finish: input.returnUrl },
      }),
    });

    return { reference: input.orderId, paymentUrl: body.redirect_url };
  }

  async verifyWebhook(request: Request): Promise<PaymentEvent> {
    const payload = (await request.json().catch(() => null)) as Record<string, string> | null;
    if (!payload?.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
      throw new InvalidWebhookError("Payload Midtrans tidak lengkap");
    }

    // signature_key = SHA512(order_id + status_code + gross_amount + server_key)
    const expected = createHash("sha512")
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverEnv.midtransServerKey}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(payload.signature_key);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new InvalidWebhookError("Signature Midtrans tidak valid");
    }

    // Pertahanan berlapis: ambil status resmi langsung dari API Midtrans,
    // bukan hanya mempercayai isi notifikasi.
    const status = await this.request<Record<string, string>>(
      `${this.coreBase}/${encodeURIComponent(payload.order_id)}/status`,
      { method: "GET" },
    );

    return {
      orderId: payload.order_id,
      reference: status.transaction_id ?? payload.transaction_id ?? null,
      status: mapMidtransStatus(status.transaction_status, status.fraud_status),
      amountIdr: status.gross_amount ? Math.round(Number(status.gross_amount)) : null,
    };
  }

  async processRefund(input: RefundInput): Promise<{ refundReference: string }> {
    const refundKey = `refund-${input.orderId}`;
    // QRIS & e-wallet memakai direct refund.
    const body = await this.request<{ status_code: string; status_message?: string; refund_key?: string }>(
      `${this.coreBase}/${encodeURIComponent(input.orderId)}/refund/online/direct`,
      {
        method: "POST",
        body: JSON.stringify({ refund_key: refundKey, amount: input.amountIdr, reason: input.reason.slice(0, 200) }),
      },
    );
    if (body.status_code !== "200") {
      throw new PaymentProviderError(`Refund Midtrans gagal: ${body.status_message ?? body.status_code}`, body);
    }
    return { refundReference: body.refund_key ?? refundKey };
  }
}

function mapMidtransStatus(transactionStatus?: string, fraudStatus?: string): PaymentEventStatus {
  switch (transactionStatus) {
    case "settlement":
      return "paid";
    case "capture":
      return fraudStatus === "accept" ? "paid" : "pending";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    case "refund":
    case "partial_refund":
      return "refunded";
    default:
      return "failed"; // deny, cancel, failure
  }
}
