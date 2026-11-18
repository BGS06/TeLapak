import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { BUSINESS } from "@/config/business";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/server/env";
import { notifyConfirmationReminder } from "@/server/order-notifications";

function verifyBearer(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Job berkala (PRD §5 & §9):
 *   1. Kedaluwarsa pesanan `pending_payment` > 1 jam → barang kembali `active`.
 *   2. Auto-release pesanan `paid_held` > 72 jam → `completed` & saldo `ready_to_payout`.
 *   3. Kirim email pengingat H+2 (24 jam sebelum auto-release) ke pembeli.
 */
async function runTick(request: Request) {
  // Memicu validasi eksplisit CRON_SECRET bila belum diset.
  void serverEnv.cronSecret;

  if (!verifyBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  const [{ data: expiredCount, error: expErr }, { data: releasedIds, error: relErr }] =
    await Promise.all([
      admin.rpc("expire_unpaid_orders"),
      admin.rpc("auto_release_orders"),
    ]);

  if (expErr) console.error("[cron] expire_unpaid_orders gagal", expErr);
  if (relErr) console.error("[cron] auto_release_orders gagal", relErr);

  // Cari pesanan paid_held yang sisa waktunya <= 24 jam dan belum dikirimi pengingat H+2.
  const reminderCutoff = new Date(
    Date.now() + BUSINESS.reminderBeforeReleaseHours * 3600 * 1000,
  ).toISOString();

  const { data: dueReminders } = await admin
    .from("orders")
    .select("id")
    .eq("status", "paid_held")
    .is("reminder_sent_at", null)
    .lte("auto_release_at", reminderCutoff)
    .limit(50);

  let remindersSent = 0;
  for (const row of dueReminders ?? []) {
    await notifyConfirmationReminder(row.id);
    await admin
      .from("orders")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("reminder_sent_at", null);
    remindersSent += 1;
  }

  return NextResponse.json({
    ok: true,
    expiredOrders: expiredCount ?? 0,
    autoReleasedOrders: releasedIds?.length ?? 0,
    remindersSent,
  });
}

export const GET = runTick;
export const POST = runTick;
