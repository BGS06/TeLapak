"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const CHAT_UNREAD_REFRESH_EVENT = "telapak:chat-unread-refresh";

let inflightFetch: Promise<number | null> | null = null;
const subscribers = new Set<(count: number) => void>();

async function fetchUnreadCountShared(): Promise<number | null> {
  if (inflightFetch) return inflightFetch;
  inflightFetch = fetch("/api/chat/unread", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as { totalUnread?: number };
      const count = typeof json.totalUnread === "number" ? Math.max(0, json.totalUnread) : 0;
      subscribers.forEach((cb) => cb(count));
      return count;
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

export function useUnreadChatCount(initialUnread: number, enabled: boolean): number {
  const pathname = usePathname();
  const [count, setCount] = useState(initialUnread);

  useEffect(() => {
    setCount(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    subscribers.add(setCount);

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadCountShared();
      }
    };

    // Segera sinkronkan saat navigasi halaman atau event kustom
    void fetchUnreadCountShared();

    const intervalId = window.setInterval(refresh, 5000);
    const onVisibility = () => refresh();
    const onFocus = () => void fetchUnreadCountShared();
    const onCustomRefresh = () => void fetchUnreadCountShared();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, onCustomRefresh);

    return () => {
      subscribers.delete(setCount);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, onCustomRefresh);
    };
  }, [enabled, pathname]);

  return enabled ? count : 0;
}
