/**
 * Akses environment variable yang terpusat & tervalidasi.
 * Variabel publik dibaca secara literal agar bisa di-inline Next.js ke bundle klien.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[env] ${name} belum diisi. Salin .env.example menjadi .env.local lalu lengkapi nilainya.`,
    );
  }
  return value;
}

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
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
