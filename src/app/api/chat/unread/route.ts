import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { totalUnread: 0, byConversation: {}, pendingOrders: 0 },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { totalUnread: 0, byConversation: {}, pendingOrders: 0 },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const [{ data: unreadRows }, { data: pendingOrdersRaw }] = await Promise.all([
      supabase.rpc("get_unread_counts"),
      supabase.rpc("get_pending_orders_count"),
    ]);

    const byConversation: Record<string, number> = {};
    let totalUnread = 0;
    for (const row of unreadRows ?? []) {
      const count = Number(row.unread_count) || 0;
      if (count > 0) {
        byConversation[row.conversation_id] = count;
        totalUnread += count;
      }
    }

    const pendingOrders =
      typeof pendingOrdersRaw === "number" ? Math.max(0, pendingOrdersRaw) : 0;

    return NextResponse.json(
      { totalUnread, byConversation, pendingOrders },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    console.error("[GET /api/chat/unread] Error:", err);
    return NextResponse.json(
      { totalUnread: 0, byConversation: {}, pendingOrders: 0 },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
