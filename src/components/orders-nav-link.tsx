"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";
import { useNavAlerts } from "@/lib/use-unread-chat";

export function OrdersNavLink({ initialPendingOrders }: { initialPendingOrders: number }) {
  const pathname = usePathname();
  const { pendingOrders } = useNavAlerts(0, initialPendingOrders, true);
  const isActive = pathname.startsWith("/orders");
  const displayCount = pendingOrders > 99 ? "99+" : String(pendingOrders);

  return (
    <Link
      href="/orders"
      aria-label={
        pendingOrders > 0 ? `Pesanan (${pendingOrders} pesanan aktif butuh perhatian)` : "Pesanan"
      }
      className={`relative hidden h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition md:inline-flex ${
        isActive
          ? "bg-[#f2f4f4] font-semibold text-[#171717]"
          : pendingOrders > 0
            ? "text-[#171717] hover:bg-[#f2f4f4]"
            : "text-[#666666] hover:bg-[#f2f4f4] hover:text-[#171717]"
      }`}
    >
      <Package className="h-4 w-4" />
      <span>Pesanan</span>
      {pendingOrders > 0 && (
        <span
          title={`${pendingOrders} pesanan aktif menunggu tindakan / COD`}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b3261e] px-1.5 text-[10px] leading-none font-bold text-white tabular-nums shadow-xs"
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}
