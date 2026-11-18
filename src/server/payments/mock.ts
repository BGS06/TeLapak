import "server-only";
import { publicEnv } from "@/lib/env";
import {
  InvalidWebhookError,
  type CreateInvoiceInput,
  type Invoice,
  type PaymentEvent,
  type PaymentProvider,
  type RefundInput,
} from "./types";

/**
 * Provider simulasi untuk pengembangan lokal tanpa akun gateway.
 * Halaman /pay/mock/[orderId] berperan sebagai "halaman QRIS" dan memicu
 * alur yang sama persis dengan webhook sungguhan.
 * Diblokir di production oleh serverEnv.paymentProvider.
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return {
      reference: `MOCK-${input.orderId}`,
      paymentUrl: `${publicEnv.siteUrl}/pay/mock/${input.orderId}`,
    };
  }

  async verifyWebhook(request: Request): Promise<PaymentEvent> {
    if (process.env.NODE_ENV === "production") {
      throw new InvalidWebhookError("Webhook mock dinonaktifkan di production");
    }
    const body = (await request.json().catch(() => null)) as { order_id?: string; amount?: number } | null;
    if (!body?.order_id) throw new InvalidWebhookError("order_id wajib diisi");
    return {
      orderId: body.order_id,
      reference: `MOCK-${body.order_id}`,
      status: "paid",
      amountIdr: body.amount ?? null,
    };
  }

  async processRefund(input: RefundInput): Promise<{ refundReference: string }> {
    return { refundReference: `MOCK-REFUND-${input.orderId}` };
  }
}
