import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { BUSINESS } from "@/config/business";
import { publicEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${BUSINESS.productName} — Jual Beli Barang Bekas Kampus Telkom`,
    template: `%s • ${BUSINESS.productName}`,
  },
  description: BUSINESS.tagline,
  applicationName: BUSINESS.productName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BUSINESS.productName,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: BUSINESS.productName,
    title: `${BUSINESS.productName} — Jual Beli Barang Bekas Kampus Telkom`,
    description: BUSINESS.tagline,
  },
  other: {
    "strix-verification": "strix-verify-0c327fbadb32f152387ced74c9119bab",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b3261e" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1017" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('telapak-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased selection:bg-[#fdeceb] selection:text-[#b3261e]">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            className: "text-xs sm:text-sm rounded-2xl shadow-lg",
          }}
        />
      </body>
    </html>
  );
}
