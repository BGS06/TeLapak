import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Lewati aset statis, gambar, ikon, webhook & cron (tidak berbasis cookie).
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|api/payments|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
