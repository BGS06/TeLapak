import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Supabase client ber-hak service role — MELEWATI RLS.
 * Hanya untuk: fungsi transaksi (RPC), webhook pembayaran, cron, dan aksi admin
 * yang sudah melewati pemeriksaan otorisasi di server.
 */
export function getSupabaseAdminClient() {
  adminClient ??= createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
