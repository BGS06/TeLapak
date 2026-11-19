import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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
 * DOKU Checkout (Jokul) — QRIS & E-Wallet tanpa biaya minimum bulanan (PRD §6).
 * Docs: https://developers.doku.com/accept-payments/doku-checkout
 */
export class DokuProvider implements PaymentProvider {
  readonly name = "doku" as const;

  private get baseUrl() {
    return serverEnv.dokuIsProduction
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com";
  }

  private sign(params: {
    clientId: string;
    requestId: string;
    timestamp: string;
    requestTarget: string;
    digest?: string;
    secretKey: string;
  }): string {
    const lines = [
      `Client-Id:${params.clientId}`,
      `Request-Id:${params.requestId}`,
      `Request-Timestamp:${params.timestamp}`,
      `Request-Target:${params.requestTarget}`,
    ];
    if (params.digest) {
      lines.push(`Digest:${params.digest}`);
    }
    const component = lines.join("\n");
    const hmac = createHmac("sha256", params.secretKey).update(component).digest("base64");
    return `HMACSHA256=${hmac}`;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const target = "/checkout/v1/payment";
    const clientId = serverEnv.dokuClientId;
    const secretKey = serverEnv.dokuSecretKey;
    const requestId = randomUUID();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    const lineItems = [
      {
        name: input.itemName.slice(0, 64),
        price: input.itemPriceIdr,
        quantity: 1,
      },
    ];
    if (input.serviceFeeIdr > 0) {
      lineItems.push({
        name: "Biaya layanan pembayaran",
        price: input.serviceFeeIdr,
        quantity: 1,
      });
    }

    const payload = {
      order: {
        amount: input.amountIdr,
        invoice_number: input.orderId,
        currency: "IDR",
        callback_url: input.returnUrl,
        line_items: lineItems,
      },
      payment: {
        payment_due_date: Math.max(15, input.expiresInMinutes),
        payment_method_types: [
          "QRIS",
          "EMONEY_SHOPEEPAY",
          "EMONEY_OVO",
          "EMONEY_DANA",
          "EMONEY_LINKAJA",
        ],
      },
      customer: {
        name: input.customer.name.slice(0, 50),
        email: input.customer.email,
      },
    };

    const rawBody = JSON.stringify(payload);
    const digest = createHash("sha256").update(rawBody).digest("base64");
    const signature = this.sign({
      clientId,
      requestId,
      timestamp,
      requestTarget: target,
      digest,
      secretKey,
    });

    const res = await fetch(`${this.baseUrl}${target}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: signature,
      },
      body: rawBody,
      cache: "no-store",
    });

    const body = (await res.json().catch(() => null)) as {
      response?: {
        order?: { invoice_number?: string };
        payment?: { url?: string; token_id?: string };
      };
      error?: { message?: string };
    } | null;

    const paymentUrl = body?.response?.payment?.url;
    if (!res.ok || !paymentUrl) {
      throw new PaymentProviderError(
        `DOKU ${res.status}: ${body?.error?.message ?? "Gagal membuat invoice pembayaran."}`,
        body,
      );
    }

    return {
      reference: body.response?.payment?.token_id ?? input.orderId,
      paymentUrl,
    };
  }

  async verifyWebhook(request: Request): Promise<PaymentEvent> {
    const rawBody = await request.text();
    const clientId = request.headers.get("client-id") ?? "";
    const requestId = request.headers.get("request-id") ?? "";
    const timestamp = request.headers.get("request-timestamp") ?? "";
    const incomingSig = request.headers.get("signature") ?? "";

    if (!clientId || !requestId || !timestamp || !incomingSig) {
      throw new InvalidWebhookError("Header tanda tangan DOKU tidak lengkap.");
    }

    const url = new URL(request.url);
    const digest = createHash("sha256").update(rawBody).digest("base64");
    const expectedSig = this.sign({
      clientId,
      requestId,
      timestamp,
      requestTarget: url.pathname,
      digest,
      secretKey: serverEnv.dokuSecretKey,
    });

    const a = Buffer.from(expectedSig);
    const b = Buffer.from(incomingSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new InvalidWebhookError("Signature DOKU tidak valid.");
    }

    const payload = JSON.parse(rawBody) as {
      order?: { invoice_number?: string; amount?: number | string };
      transaction?: { status?: string; original_request_id?: string };
    };

    const orderId = payload.order?.invoice_number;
    if (!orderId) {
      throw new InvalidWebhookError("Payload DOKU tidak menyertakan invoice_number.");
    }

    const rawAmount = payload.order?.amount;
    const amountIdr =
      rawAmount !== undefined && rawAmount !== null ? Math.round(Number(rawAmount)) : null;

    return {
      orderId,
      reference: payload.transaction?.original_request_id ?? requestId,
      status: mapDokuStatus(payload.transaction?.status),
      amountIdr: Number.isFinite(amountIdr) ? amountIdr : null,
    };
  }

  async processRefund(input: RefundInput): Promise<{ refundReference: string }> {
    // DOKU QRIS refund umumnya diproses lewat DOKU Back Office atau API refund khusus kanal.
    // Mencatat referensi refund agar admin dapat menindaklanjuti atau rekonsiliasi secara aman.
    const refundReference = `doku-refund-${input.orderId.slice(0, 8)}-${Date.now()}`;
    console.info(
      `[doku:refund] order=${input.orderId} amount=${input.amountIdr} ref=${refundReference} reason=${input.reason}`,
    );
    return { refundReference };
  }
}

function mapDokuStatus(status?: string): PaymentEventStatus {
  switch ((status ?? "").toUpperCase()) {
    case "SUCCESS":
      return "paid";
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    case "REFUNDED":
      return "refunded";
    default:
      return "failed";
  }
}
