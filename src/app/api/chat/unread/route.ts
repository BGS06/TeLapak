import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { totalUnread: 0, byConversation: {} },
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
        { totalUnread: 0, byConversation: {} },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const { data, error } = await supabase.rpc("get_unread_counts");
    if (error || !data) {
      return NextResponse.json(
        { totalUnread: 0, byConversation: {} },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const byConversation: Record<string, number> = {};
    let totalUnread = 0;
    for (const row of data) {
      const count = Number(row.unread_count) || 0;
      if (count > 0) {
        byConversation[row.conversation_id] = count;
        totalUnread += count;
      }
    }

    return NextResponse.json(
      { totalUnread, byConversation },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    console.error("[GET /api/chat/unread] Error:", err);
    return NextResponse.json(
      { totalUnread: 0, byConversation: {} },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
