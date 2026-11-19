import "server-only";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Variabel ${name} belum diisi di pengaturan Environment Variables Vercel / .env.local.`,
    );
  }
  return value;
}

/** Environment khusus server. Diakses lazy agar build tidak gagal saat variabel belum diisi. */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get paymentProvider(): "mock" | "midtrans" | "doku" {
    const value = (process.env.PAYMENT_PROVIDER ?? "mock").trim();
    if (value !== "mock" && value !== "midtrans" && value !== "doku") {
      throw new Error(`[env] PAYMENT_PROVIDER tidak dikenal: ${value}`);
    }
    return value;
  },
  get midtransServerKey() {
    return required("MIDTRANS_SERVER_KEY");
  },
  midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  get dokuClientId() {
    return required("DOKU_CLIENT_ID");
  },
  get dokuSecretKey() {
    return required("DOKU_SECRET_KEY");
  },
  dokuIsProduction: process.env.DOKU_IS_PRODUCTION === "true",
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "TeLapak <notifikasi@telapak.id>",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
  get cronSecret() {
    return required("CRON_SECRET");
  },
};

export function getIntegrationStatus() {
  const provider = (process.env.PAYMENT_PROVIDER ?? "mock").trim();
  const midtransReady = Boolean(process.env.MIDTRANS_SERVER_KEY?.trim());
  const dokuReady = Boolean(
    process.env.DOKU_CLIENT_ID?.trim() && process.env.DOKU_SECRET_KEY?.trim(),
  );
  const resendReady = Boolean(process.env.RESEND_API_KEY?.trim());
  return {
    paymentProvider: provider as "mock" | "midtrans" | "doku",
    midtransReady,
    midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    dokuReady,
    dokuIsProduction: process.env.DOKU_IS_PRODUCTION === "true",
    resendReady,
    emailFrom: serverEnv.emailFrom,
  };
}
