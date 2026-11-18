import type { MetadataRoute } from "next";
import { BUSINESS } from "@/config/business";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.productName} — Marketplace Barang Bekas Kampus Telkom`,
    short_name: BUSINESS.productName,
    description: BUSINESS.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#b3261e",
    orientation: "portrait",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
