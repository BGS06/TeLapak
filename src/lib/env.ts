/**
 * Akses environment variable yang terpusat & tervalidasi.
 * Variabel publik dibaca secara literal agar bisa di-inline Next.js ke bundle klien.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[env] ${name} belum diisi. Pastikan Environment Variables sudah diatur di .env.local / Vercel.`,
    );
  }
  return value;
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_URL);

  // Jika di Vercel namun NEXT_PUBLIC_SITE_URL masih tertulis localhost, gunakan domain Vercel otomatis.
  if (explicit && !(onVercel && explicit.includes("localhost"))) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (explicit || "http://localhost:3000").replace(/\/$/, "");
}

export const publicEnv = {
  get siteUrl() {
    return resolveSiteUrl();
  },
  defaultCampusSlug: process.env.NEXT_PUBLIC_DEFAULT_CAMPUS_SLUG ?? "tel-u-surabaya",
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
};

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
