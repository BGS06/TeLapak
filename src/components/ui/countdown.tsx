"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export function Countdown({
  targetIso,
  expiredText = "Waktu habis",
}: {
  targetIso: string;
  expiredText?: string;
}) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => setRemainingMs(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (remainingMs === null) {
    return <span className="tabular-nums font-semibold">--:--:--</span>;
  }

  if (remainingMs <= 0) {
    return <span className="font-semibold text-[#991b1b]">{expiredText}</span>;
  }

  return <span className="tabular-nums font-bold">{formatRemaining(remainingMs)}</span>;
}
