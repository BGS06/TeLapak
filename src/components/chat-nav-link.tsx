"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useUnreadChatCount } from "@/lib/use-unread-chat";

export function ChatNavLink({ initialUnread }: { initialUnread: number }) {
  const pathname = usePathname();
  const unread = useUnreadChatCount(initialUnread, true);
  const isActive = pathname.startsWith("/messages");
  const displayCount = unread > 99 ? "99+" : String(unread);

  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? `Chat (${unread} pesan belum dibaca)` : "Chat"}
      className={`relative hidden h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition md:inline-flex ${
        isActive
          ? "bg-[#f2f4f4] font-semibold text-[#171717]"
          : unread > 0
            ? "text-[#171717] hover:bg-[#f2f4f4]"
            : "text-[#666666] hover:bg-[#f2f4f4] hover:text-[#171717]"
      }`}
    >
      <span className="relative inline-flex items-center">
        <MessageSquare className="h-4 w-4" />
      </span>
      <span>Chat</span>
      {unread > 0 && (
        <span
          title={`${unread} pesan atau tawaran baru belum dibaca`}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b3261e] px-1.5 text-[10px] leading-none font-bold text-white tabular-nums shadow-xs"
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}
