import "server-only";
import { serverEnv } from "@/server/env";
import { MidtransProvider } from "./midtrans";
import { MockProvider } from "./mock";
import type { PaymentProvider, PaymentProviderName } from "./types";

export * from "./types";

const registry: Record<PaymentProviderName, () => PaymentProvider> = {
  mock: () => new MockProvider(),
  midtrans: () => new MidtransProvider(),
};

export function isPaymentProviderName(value: string): value is PaymentProviderName {
  return value in registry;
}

/**
 * Provider aktif untuk pesanan BARU (dari PAYMENT_PROVIDER).
 * Untuk webhook/refund pesanan lama, panggil dengan nama provider yang
 * tersimpan di orders.payment_provider.
 */
export function getPaymentProvider(name: PaymentProviderName = serverEnv.paymentProvider): PaymentProvider {
  return registry[name]();
}
