import type { Campus, Listing, PublicProfile } from "@/types/database";

/**
 * Data pratinjau lokal yang hanya dipakai bila NEXT_PUBLIC_SUPABASE_URL belum diisi.
 * Begitu .env.local terhubung ke Supabase, seluruh query langsung membaca database nyata.
 */

function svgPhoto(opts: { bg: string; accent: string; title: string; subtitle: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="${opts.bg}"/>
    <circle cx="660" cy="140" r="180" fill="${opts.accent}" opacity="0.12"/>
    <circle cx="140" cy="680" r="220" fill="${opts.accent}" opacity="0.1"/>
    <rect x="88" y="88" width="624" height="624" rx="28" fill="none" stroke="${opts.accent}" stroke-opacity="0.22" stroke-width="3"/>
    <text x="128" y="160" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="700" fill="${opts.accent}" letter-spacing="2">TEL-U SURABAYA • CONTOH FOTO</text>
    <text x="128" y="420" font-family="system-ui,-apple-system,sans-serif" font-size="52" font-weight="800" fill="#1c1917">${opts.title}</text>
    <text x="128" y="476" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="500" fill="#57534e">${opts.subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEMO_CAMPUS: Campus = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Telkom University Surabaya",
  slug: "tel-u-surabaya",
  allowed_email_domains: ["student.telkomuniversity.ac.id", "telkomuniversity.ac.id"],
  meeting_points: ["Lobi Gedung Utama", "Kantin Kampus", "Area Parkir Mahasiswa", "Perpustakaan"],
  is_active: true,
  created_at: "2026-11-18T08:00:00.000Z",
};

export const DEMO_SELLERS: Record<string, PublicProfile> = {
  "00000000-0000-4000-8000-000000000101": {
    id: "00000000-0000-4000-8000-000000000101",
    campus_id: DEMO_CAMPUS.id,
    first_name: "Raka",
    user_type: "student",
    verification_status: "verified",
    created_at: "2026-10-05T09:00:00.000Z",
  },
  "00000000-0000-4000-8000-000000000102": {
    id: "00000000-0000-4000-8000-000000000102",
    campus_id: DEMO_CAMPUS.id,
    first_name: "Nadia",
    user_type: "student",
    verification_status: "verified",
    created_at: "2026-10-12T09:00:00.000Z",
  },
  "00000000-0000-4000-8000-000000000103": {
    id: "00000000-0000-4000-8000-000000000103",
    campus_id: DEMO_CAMPUS.id,
    first_name: "Dimas",
    user_type: "alumni",
    verification_status: "verified",
    created_at: "2026-09-20T09:00:00.000Z",
  },
  "00000000-0000-4000-8000-000000000104": {
    id: "00000000-0000-4000-8000-000000000104",
    campus_id: DEMO_CAMPUS.id,
    first_name: "Alya",
    user_type: "lecturer",
    verification_status: "verified",
    created_at: "2026-10-01T09:00:00.000Z",
  },
};

export const DEMO_LISTINGS: Listing[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000102",
    title: "HMNS Orgasm EDP 100ml (Sisa 85%, Box Lengkap)",
    description:
      "Beli langsung di official store HMNS bulan lalu. Sisa sekitar 85% sesuai garis botol di foto, sprayer masih sangat halus, batch code tembus di kardus. Dijual karena ganti aroma yang lebih fresh untuk kuliah pagi.",
    category: "parfum",
    condition: "like_new",
    price_idr: 215_000,
    meeting_point: "Lobi Gedung Utama",
    meeting_point_note: "Senin–Jumat jam 12.00–13.30 sehabis kelas",
    image_urls: [
      svgPhoto({ bg: "#f6efe9", accent: "#b3261e", title: "HMNS Orgasm", subtitle: "EDP 100ml • Sisa 85% + Box" }),
      svgPhoto({ bg: "#f3ebe3", accent: "#7c2d12", title: "Batch Code & Box", subtitle: "Original Official Store" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-18T14:20:00.000Z",
    updated_at: "2026-11-18T14:20:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000101",
    title: "Kalkulator Ilmiah Casio FX-991EX ClassWiz Original",
    description:
      "Dipakai 2 semester untuk Kalkulus dan Statistika. Semua tombol responsif, layar bersih tanpa dead pixel, tutup geser masih rapat. Sudah termasuk baterai baru.",
    category: "elektronik",
    condition: "good",
    price_idr: 165_000,
    meeting_point: "Perpustakaan",
    meeting_point_note: "Meja baca lantai 1 dekat loker",
    image_urls: [
      svgPhoto({ bg: "#eef2f6", accent: "#1e3a8a", title: "Casio FX-991EX", subtitle: "ClassWiz • Normal 100%" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-18T11:10:00.000Z",
    updated_at: "2026-11-18T11:10:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000103",
    title: "Mouse Wireless Logitech M331 Silent Plus + Receiver",
    description:
      "Klik senyap cocok dipakai di perpustakaan atau ruang lab. Scroll wheel aman tidak loncat, receiver USB original tersimpan di slot bawah mouse. Minus pemakaian wajar di grip samping.",
    category: "elektronik",
    condition: "good",
    price_idr: 85_000,
    meeting_point: "Kantin Kampus",
    meeting_point_note: "Area meja tengah dekat booth kopi",
    image_urls: [
      svgPhoto({ bg: "#eef4f0", accent: "#14532d", title: "Logitech M331", subtitle: "Silent Click • USB Receiver" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-18T09:30:00.000Z",
    updated_at: "2026-11-18T09:30:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000102",
    title: "Kahf Revered Oud Eau de Toilette 35ml (2x Semprot)",
    description:
      "Baru beli minggu lalu di Indomaret Ketintang, baru disemprot 2 kali untuk coba wangi. Botol dan box mulus seperti baru keluar toko.",
    category: "parfum",
    condition: "like_new",
    price_idr: 48_000,
    meeting_point: "Lobi Gedung Utama",
    meeting_point_note: null,
    image_urls: [
      svgPhoto({ bg: "#f5f2eb", accent: "#713f12", title: "Kahf Revered Oud", subtitle: "EDT 35ml • 98% Penuh" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-17T18:45:00.000Z",
    updated_at: "2026-11-17T18:45:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000101",
    title: "Sleeve Laptop 14 Inci Waterproof Abu Tua + Pouch Charger",
    description:
      "Muat ThinkPad/MacBook/ASUS 14 inci. Busa dalam tebal dan halus, resleting YKK lancar, bonus pouch kecil untuk charger dan mouse.",
    category: "aksesoris",
    condition: "like_new",
    price_idr: 55_000,
    meeting_point: "Area Parkir Mahasiswa",
    meeting_point_note: "Dekat pos keluar motor",
    image_urls: [
      svgPhoto({ bg: "#f1f0ee", accent: "#374151", title: "Sleeve Laptop 14\"", subtitle: "Busa Tebal + Pouch Charger" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-17T15:00:00.000Z",
    updated_at: "2026-11-17T15:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000206",
    campus_id: DEMO_CAMPUS.id,
    seller_id: "00000000-0000-4000-8000-000000000104",
    title: "Buku Clean Architecture & Designing Data-Intensive Apps",
    description:
      "Paket 2 buku referensi wajib mahasiswa Informatika/RPL. Kertas bersih, tidak ada coretan stabilo, sampul sudah disampul plastik rapi.",
    category: "lainnya",
    condition: "good",
    price_idr: 120_000,
    meeting_point: "Perpustakaan",
    meeting_point_note: "Jam kerja 09.00–16.00",
    image_urls: [
      svgPhoto({ bg: "#f7f1ec", accent: "#9a3412", title: "Paket 2 Buku RPL", subtitle: "Clean Arch + DDIA" }),
    ],
    status: "active",
    taken_down_at: null,
    created_at: "2026-11-17T08:15:00.000Z",
    updated_at: "2026-11-17T08:15:00.000Z",
  },
];
