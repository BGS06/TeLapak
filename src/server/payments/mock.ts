import "server-only";
import {
  InvalidWebhookError,
  type CreateInvoiceInput,
  type Invoice,
  type PaymentEvent,
  type PaymentProvider,
  type RefundInput,
} from "./types";

/**
 * Provider simulasi QRIS & E-Wallet untuk MVP / pengujian tanpa akun gateway berbayar.
 * Halaman /pay/mock/[orderId] berperan sebagai halaman pembayaran QRIS dan memicu
 * alur state machine yang sama persis dengan webhook gateway.
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return {
      reference: `MOCK-${input.orderId}`,
      // Gunakan path relatif agar selalu bekerja baik di localhost maupun di domain Vercel.
      paymentUrl: `/pay/mock/${input.orderId}`,
    };
  }

  async verifyWebhook(request: Request): Promise<PaymentEvent> {
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
