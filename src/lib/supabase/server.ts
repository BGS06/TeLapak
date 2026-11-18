import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Supabase client berbasis sesi pengguna (cookie) untuk Server Component,
 * Server Action, dan Route Handler. Semua query tunduk pada RLS.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component (read-only). Aman diabaikan karena
          // middleware sudah me-refresh sesi pada setiap request.
        }
      },
    },
  });
}
