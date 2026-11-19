"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, PlusCircle, ShieldCheck, User } from "lucide-react";

export function MobileBottomNav({
  isLoggedIn,
  isAdmin,
  isVerified,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isVerified: boolean;
}) {
  const pathname = usePathname();

  // Sembunyikan bottom nav di halaman checkout pembayaran agar tidak bertumpuk dengan tombol bayar
  if (pathname.startsWith("/pay/")) {
    return null;
  }

  const items = [
    {
      href: "/",
      label: "Katalog",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/orders",
      label: "Pesanan",
      icon: Package,
      active: pathname.startsWith("/orders"),
    },
    {
      href: "/sell",
      label: "Jual",
      icon: PlusCircle,
      active: pathname === "/sell",
      highlight: true,
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
        className={`mx-auto grid max-w-md items-center px-2 py-1.5 ${
          isAdmin ? "grid-cols-5" : "grid-cols-4"
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
                  className={`flex h-9 items-center gap-1 rounded-full px-3.5 text-xs font-bold shadow-xs transition-colors ${
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
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold select-none active:scale-95 transition-all ${
                item.active ? "text-[#b3261e]" : "text-[#6e675f] hover:text-[#181512]"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.active ? "stroke-[2.4px]" : "stroke-[1.9px]"}`} />
                {item.dot && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[#146c43] ring-2 ring-white" />
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
