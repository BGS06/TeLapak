"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Package, PlusCircle, ShieldCheck, User } from "lucide-react";
import { useUnreadChatCount } from "@/lib/use-unread-chat";

export function MobileBottomNav({
  isLoggedIn,
  isAdmin,
  isVerified,
  initialUnreadChat = 0,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  initialUnreadChat?: number;
}) {
  const pathname = usePathname();
  const unreadChat = useUnreadChatCount(initialUnreadChat, isLoggedIn);

  // Sembunyikan bottom nav di halaman checkout pembayaran agar tidak bertumpuk dengan tombol bayar
  if (pathname.startsWith("/pay/")) {
    return null;
  }

  const items: Array<{
    href: string;
    label: string;
    icon: typeof Home;
    active: boolean;
    highlight?: boolean;
    dot?: boolean;
    badge?: number;
  }> = [
    {
      href: "/",
      label: "Katalog",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/messages",
      label: "Chat",
      icon: MessageSquare,
      active: pathname.startsWith("/messages"),
      badge: unreadChat,
    },
    {
      href: "/sell",
      label: "Jual",
      icon: PlusCircle,
      active: pathname === "/sell",
      highlight: true,
    },
    {
      href: "/orders",
      label: "Pesanan",
      icon: Package,
      active: pathname.startsWith("/orders"),
    },
    {
      href: isLoggedIn ? "/profile" : "/login",
      label: isLoggedIn ? "Profil" : "Masuk",
      icon: User,
      active: pathname.startsWith("/profile") || pathname === "/login" || pathname === "/register",
      dot: isLoggedIn && isVerified,
    },
  ];

  if (isAdmin) {
    items.push({
      href: "/admin",
      label: "Admin",
      icon: ShieldCheck,
      active: pathname.startsWith("/admin"),
    });
  }

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6e0d6] bg-white/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className={`mx-auto grid max-w-md items-center px-1.5 py-1.5 ${
          isAdmin ? "grid-cols-6" : "grid-cols-5"
        }`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center justify-center py-0.5 select-none active:scale-95 transition-transform"
              >
                <span
                  className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold shadow-xs transition-colors ${
                    item.active
                      ? "bg-[#8f1c15] text-white"
                      : "bg-[#b3261e] text-white group-hover:bg-[#931d16]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold select-none active:scale-95 transition-all ${
                item.active ? "text-[#b3261e]" : "text-[#6e675f] hover:text-[#181512]"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.active ? "stroke-[2.4px]" : "stroke-[1.9px]"}`} />
                {item.badge && item.badge > 0 ? (
                  <span
                    aria-label={`${item.badge} pesan belum dibaca`}
                    className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#b3261e] px-1 text-[9px] leading-none font-bold text-white tabular-nums ring-2 ring-white"
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : item.dot ? (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[#146c43] ring-2 ring-white" />
                ) : null}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
