/**
 * Abstraksi wajib pembayaran (PRD §6).
 * Seluruh logika aplikasi hanya bergantung pada antarmuka ini sehingga
 * gateway (Midtrans, DOKU, dst.) bisa diganti tanpa merombak alur pesanan.
 */

export type PaymentProviderName = "mock" | "midtrans" | "doku";

export type PaymentEventStatus = "paid" | "pending" | "expired" | "failed" | "refunded";

export interface CreateInvoiceInput {
  orderId: string;
  /** Total yang dibayar pembeli (harga barang + biaya layanan). */
  amountIdr: number;
  itemName: string;
  itemPriceIdr: number;
  serviceFeeIdr: number;
  customer: { name: string; email: string };
  expiresInMinutes: number;
  /** Halaman tujuan setelah pembeli selesai di halaman pembayaran. */
  returnUrl: string;
}

export interface Invoice {
  /** Referensi transaksi di sisi gateway. */
  reference: string;
  /** URL halaman pembayaran (QRIS / e-wallet) untuk pembeli. */
  paymentUrl: string;
}

export interface PaymentEvent {
  orderId: string;
  reference: string | null;
  status: PaymentEventStatus;
  /** Nominal yang benar-benar dibayar (untuk dicocokkan dengan pesanan). */
  amountIdr: number | null;
}

export interface RefundInput {
  orderId: string;
  reference: string | null;
  amountIdr: number;
  reason: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
  /** Memverifikasi keaslian notifikasi webhook dan menormalkan isinya. */
  verifyWebhook(request: Request): Promise<PaymentEvent>;
  processRefund(input: RefundInput): Promise<{ refundReference: string }>;
}

/** Notifikasi webhook tidak valid (tanda tangan salah, payload rusak). Balas 401/400. */
export class InvalidWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWebhookError";
  }
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
