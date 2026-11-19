"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const CHAT_UNREAD_REFRESH_EVENT = "telapak:chat-unread-refresh";

export interface NavAlertCounts {
  unreadChat: number;
  pendingOrders: number;
}

let inflightFetch: Promise<NavAlertCounts | null> | null = null;
const subscribers = new Set<(counts: NavAlertCounts) => void>();

async function fetchNavAlertsShared(): Promise<NavAlertCounts | null> {
  if (inflightFetch) return inflightFetch;
  inflightFetch = fetch("/api/chat/unread", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as {
        totalUnread?: number;
        pendingOrders?: number;
      };
      const counts: NavAlertCounts = {
        unreadChat: typeof json.totalUnread === "number" ? Math.max(0, json.totalUnread) : 0,
        pendingOrders:
          typeof json.pendingOrders === "number" ? Math.max(0, json.pendingOrders) : 0,
      };
      subscribers.forEach((cb) => cb(counts));
      return counts;
    })
    .catch(() => null)
    .finally(() => {
      inflightFetch = null;
    });
  return inflightFetch;
}

export function triggerChatUnreadRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
  }
}

export function useNavAlerts(
  initialUnreadChat: number,
  initialPendingOrders: number,
  enabled: boolean,
): NavAlertCounts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavAlertCounts>({
    unreadChat: initialUnreadChat,
    pendingOrders: initialPendingOrders,
  });

  useEffect(() => {
    setCounts({
      unreadChat: initialUnreadChat,
      pendingOrders: initialPendingOrders,
    });
  }, [initialUnreadChat, initialPendingOrders]);

  useEffect(() => {
    if (!enabled) {
      setCounts({ unreadChat: 0, pendingOrders: 0 });
      return;
    }

    subscribers.add(setCounts);

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetchNavAlertsShared();
      }
    };

    void fetchNavAlertsShared();

    const intervalId = window.setInterval(refresh, 5000);
    const onVisibility = () => refresh();
    const onFocus = () => void fetchNavAlertsShared();
    const onCustomRefresh = () => void fetchNavAlertsShared();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, onCustomRefresh);

    return () => {
      subscribers.delete(setCounts);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, onCustomRefresh);
    };
  }, [enabled, pathname]);

  return enabled ? counts : { unreadChat: 0, pendingOrders: 0 };
}

export function useUnreadChatCount(initialUnread: number, enabled: boolean): number {
  return useNavAlerts(initialUnread, 0, enabled).unreadChat;
}
