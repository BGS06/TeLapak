# TeLapak — Marketplace Barang Bekas Kampus Telkom

Aplikasi web *mobile-first* untuk jual beli barang bekas antar mahasiswa, dosen, dan alumni **Telkom University Surabaya** (dirancang sejak awal dengan arsitektur **multi-kampus** agar siap diperluas ke kampus cabang Telkom University lainnya hanya dengan menambah baris pada tabel `campuses`).

---

## Arsitektur & Struktur Proyek

```text
e:\LapakTelu
├── supabase/migrations/
│   ├── 20261119000100_core_schema.sql         # Tabel, enum, constraint, partial unique index anti-double-booking
│   ├── 20261119000200_auth_helpers.sql        # Trigger handle_new_user, view public_profiles, RPC get_seller_contact
│   ├── 20261119000300_rls_policies.sql        # Row Level Security & column-level privilege grants
│   ├── 20261119000400_order_functions.sql     # State machine pesanan atomik (SECURITY DEFINER + FOR UPDATE locking)
│   ├── 20261119000500_storage.sql             # Bucket listing-images (publik), verification-docs & dispute-evidence (privat)
│   ├── 20261119000600_seed_launch_campus.sql  # Data peluncuran Telkom University Surabaya & titik temu resmi
│   └── 20261119000700_cron_jobs.sql           # Penjadwalan pg_cron (auto-expire 1 jam & auto-release 72 jam)
├── src/
│   ├── config/
│   │   ├── business.ts                        # Parameter bisnis (komisi 3%, biaya QRIS 0,7%, batas harga & payout)
│   │   └── constants.ts                       # Label kategori, kondisi, status pesanan, & pesan error standar PRD
│   ├── types/
│   │   └── database.ts                        # Tipe penuh skema PostgreSQL/Supabase (Tabel, View, RPC, Enum)
│   ├── lib/
│   │   ├── env.ts                             # Validasi environment variable publik
│   │   ├── utils.ts                           # Format Rupiah, waktu WIB, normalisasi WhatsApp, kode pesanan
│   │   ├── validations.ts                     # Skema Zod untuk form auth, profil penjual, barang, sengketa, laporan
│   │   ├── image.ts                           # Kompresi gambar sisi klien ke WebP (<800 KB) via browser-image-compression
│   │   └── supabase/                          # Supabase client (browser, server SSR, service-role admin, middleware)
│   ├── server/
│   │   ├── auth.ts                            # Helper sesi, guard halaman privat & admin, cek kesiapan penjual Tingkat 2
│   │   ├── errors.ts                          # Pemetaan kode error database ke pesan Bahasa Indonesia standar PRD
│   │   ├── queries.ts                         # Query katalog, detail barang, pesanan, buku besar saldo, & antrean admin
│   │   ├── order-notifications.ts             # Pengiriman 4 format email transaksional wajib PRD
│   │   ├── payments/                          # Abstraksi PaymentProvider (Midtrans Snap QRIS/e-wallet + Mock lokal)
│   │   ├── email/                             # Integrasi Resend API & template HTML email transaksional
│   │   └── actions/                           # Server Actions (auth, profile, listings, orders, reports, admin)
│   ├── components/                            # Komponen UI (Header, Footer, ListingCard, ListingForm, Button, Badge, Countdown)
│   └── app/
│       ├── page.tsx                           # `/` — Beranda & katalog bersih (pencarian, filter kategori & kondisi)
│       ├── items/[id]/page.tsx                # `/items/[id]` — Detail barang + OpenGraph WhatsApp + Beli / Bagikan / Laporkan
│       ├── items/[id]/edit/page.tsx           # `/items/[id]/edit` — Ubah barang
│       ├── sell/page.tsx                      # `/sell` — Form pasang barang + pemeriksaan syarat penjual Tingkat 2
│       ├── orders/page.tsx                    # `/orders` — Riwayat pembelian & penjualan
│       ├── orders/[id]/page.tsx               # `/orders/[id]` — Detail pesanan, titik temu, tombol WA penjual, hitung mundur 72 jam
│       ├── profile/page.tsx                   # `/profile` — Verifikasi Tingkat 1, rekening Tingkat 2, & buku besar saldo penjual
│       ├── admin/page.tsx                     # `/admin` — Panel admin 4 tab (Verifikasi, Sengketa, Payout, Laporan)
│       ├── login/page.tsx & register/page.tsx # Autentikasi civitas (validasi domain email kampus vs jalur alumni/dosen)
│       ├── pay/mock/[orderId]/page.tsx        # Simulator pembayaran QRIS lokal saat PAYMENT_PROVIDER=mock
│       ├── api/payments/webhook/[provider]/   # Endpoint webhook pembayaran (verifikasi signature + mark_order_paid)
│       └── api/cron/tick/route.ts             # Endpoint cron (auto-expire 1 jam, auto-release 72 jam, email pengingat H+2)
```

---

## Cara Menjalankan

1. **Salin konfigurasi environment:**
   ```bash
   cp .env.example .env.local
   ```
   *(Catatan: Jika `.env.local` belum dihubungkan ke Supabase, aplikasi tetap dapat dijalankan dalam **Mode Pratinjau Lokal** untuk melihat katalog contoh Telkom University Surabaya).*

2. **Jalankan migrasi database di Supabase:**
   Jalankan seluruh file SQL di folder `supabase/migrations/` secara berurutan pada SQL Editor Supabase (atau menggunakan `npx supabase db push`).

3. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.
