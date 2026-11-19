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
  get paymentProvider(): "mock" | "midtrans" {
    const value = (process.env.PAYMENT_PROVIDER ?? "mock").trim();
    if (value !== "mock" && value !== "midtrans") {
      throw new Error(`[env] PAYMENT_PROVIDER tidak dikenal: ${value}`);
    }
    return value;
  },
  get midtransServerKey() {
    return required("MIDTRANS_SERVER_KEY");
  },
  midtransIsProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "TeLapak <notifikasi@telapak.id>",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL,
  get cronSecret() {
    return required("CRON_SECRET");
  },
};
