# Product Requirements Document (PRD): Marketplace Barang Bekas Kampus Telkom

**Versi:** 1.0 (Siap Dibangun / MVP)  
**Tanggal:** 18 November 2026  
**Nama Produk:** `[LapakTelu]`  
**Status:** Siap diserahkan ke tim/agen pengembang (Antigravity)

---

## 1. Ringkasan Eksekutif & Tujuan

Jual beli barang bekas antar mahasiswa, alumni, dan dosen di **Telkom University Surabaya** saat ini masih mengandalkan grup WhatsApp. Barang mudah tenggelam di chat, sulit dicari, dan tidak memiliki perlindungan transaksi. Produk ini menggantikannya dengan aplikasi web *mobile-first* yang rapi, aman, mudah dibagikan ke grup WhatsApp, dan dirancang sejak awal agar dapat diperluas ke kampus cabang Telkom University lainnya tanpa merombak sistem.

### Tujuan Utama (v1)
1. **Pembeli** menemukan barang bekas dengan cepat dan membayar secara aman tanpa takut penipuan.
2. **Penjual** memasang barang dalam hitungan menit tanpa harus membuat toko.
3. **Arsitektur Multi-Kampus** siap dipakai kampus cabang Telkom lain hanya dengan menambah data kampus baru.
4. **Monetisasi Awal** berjalan lewat komisi kecil per transaksi sejak versi 1.

---

## 2. Ruang Lingkup (Scope)

### Termasuk dalam Versi 1 (In-Scope)
* Akun tunggal untuk semua peran (mahasiswa, alumni, dosen bisa menjual dan membeli tanpa registrasi toko).
* Beranda bersih ala katalog (pencarian, filter kategori, grid kartu barang tanpa banner promo ramai).
* Halaman detail barang dengan pratinjau link (*OpenGraph*) yang rapi saat dibagikan ke WhatsApp.
* Alur checkout dengan penahanan dana sementara (*hold*), pelepasan nomor WhatsApp penjual setelah pembayaran terkonfirmasi, dan tombol konfirmasi penerimaan barang.
* Panel admin sederhana untuk moderasi barang, verifikasi alumni/dosen manual, penyelesaian sengketa, dan pengelolaan pencairan dana (*payout*).

### Bukan-Tujuan Versi 1 (Out-of-Scope)
* Fitur toko, variasi produk, manajemen stok banyak unit, dan voucher diskon (mayoritas barang bekas hanya 1 unit).
* Pengiriman via kurir dan transaksi lintas kampus (v1 khusus COD/titik temu dalam satu kampus).
* Chat di dalam aplikasi, ulasan/rating, notifikasi *push*, promosi berbayar, dan aplikasi mobile native (Android/iOS).

### Anti-Tujuan (Kegagalan Produk meski Teknis Berjalan)
* Pengguna kembali ke grup WhatsApp karena alur unggah barang atau checkout terasa lebih merepotkan.
* Dana pembeli tertahan tanpa kejelasan atau penjual tidak menerima pembayaran.
* Barang palsu (mis. parfum KW) atau barang curian merusak kepercayaan komunitas.

---

## 3. Pengguna, Autentikasi & Verifikasi

### Jenis Akun & Verifikasi Dua Tingkat
1. **Tingkat 1 — Akses Masuk, Lihat, dan Beli:**
   * **Mahasiswa & Dosen Aktif:** Daftar dan masuk menggunakan email kampus resmi (validasi domain email sesuai daftar kampus pada tabel `campuses`, misalnya `@telkomuniversity.ac.id` atau domain cabang terkait).
   * **Alumni / Dosen Tanpa Email Kampus Aktif:** Daftar dengan email pribadi lalu mengunggah foto bukti identitas kampus (Kartu Alumni, KTM lama, NIDN, atau ijazah) yang masuk ke antrean persetujuan manual admin.
2. **Tingkat 2 — Syarat Menjadi Penjual:**
   * Sebelum memasang barang pertama, pengguna wajib melengkapi **nomor WhatsApp aktif** dan **data rekening bank atau e-wallet tujuan pencairan** (nama pemilik rekening wajib sesuai nama akun).
   * *Catatan Privasi & Keamanan:* Data sensitif (KTP/dokumen identitas bila diperlukan di fase berikutnya) tidak disimpan di database aplikasi jika ditangani penyedia pembayaran; foto bukti alumni/dosen pada v1 disimpan di *private bucket* Supabase Storage dan dihapus setelah diverifikasi admin.

---

## 4. Arsitektur Multi-Kampus

Setiap pengguna, barang (`listings`), dan pesanan (`orders`) terikat pada satu `campus_id`.
* **Data Kampus:** Nama kampus, *slug* URL, daftar domain email yang diizinkan, dan daftar titik temu resmi kampus disimpan di database sebagai data konfigurasi.
* **Kampus Peluncuran:** Telkom University Surabaya (contoh titik temu bawaan: *Lobi Gedung Utama*, *Kantin Kampus*, *Area Parkir Mahasiswa*, *Perpustakaan*).
* **Tampilan Awal:** Beranda secara bawaan hanya menampilkan barang dari kampus pengguna yang sedang masuk (atau kampus default saat belum masuk).

---

## 5. Alur Utama & State Machine Pesanan

### Alur Transaksi End-to-End
1. Penjual memasang barang (foto, judul, kategori, kondisi, harga, titik temu).
2. Pembeli mencari barang, membuka halaman detail, lalu menekan **"Beli"**.
3. Pembeli membayar di web (utamakan **QRIS** dan e-wallet). Status barang berubah menjadi `reserved` agar tidak dibeli orang lain.
4. Setelah pembayaran sukses, **dana ditahan di rekening platform** dan **nomor WhatsApp penjual dibuka** hanya untuk pembeli tersebut.
5. Pembeli dan penjual janjian bertemu di titik temu kampus.
6. Saat serah terima:
   * **Jika sesuai:** Pembeli menekan **"Barang Diterima"** → status menjadi `completed`, saldo bersih penjual (harga dikurangi komisi) masuk ke buku besar pencairan (`payout_ledger`).
   * **Jika tidak ada aksi setelah 3 hari (72 jam):** Sistem otomatis mengubah status menjadi `completed` (selama tidak ada laporan masalah).
   * **Jika ada masalah atau sepakat batal di tempat:** Pembeli menekan **"Laporkan Masalah"** (sebelum batas 3 hari) → pencairan dihentikan (`disputed`), admin meninjau bukti dari kedua pihak lalu memutuskan `refund` ke pembeli atau `release` ke penjual.
7. Jika pembeli tidak membayar dalam **1 jam**, pesanan otomatis menjadi `expired` dan status barang kembali `active`.

### State Machine Status Pesanan (`orders.status`)
| Status | Pemicu | Efek ke Barang (`listings.status`) |
| :--- | :--- | :--- |
| `pending_payment` | Pembeli klik "Beli" | `reserved` |
| `paid_held` | Webhook pembayaran sukses | `reserved` (WhatsApp penjual terbuka) |
| `completed` | Pembeli klik "Barang Diterima" / auto-release 72 jam / putusan admin | `sold` |
| `disputed` | Pembeli klik "Laporkan Masalah" saat `paid_held` | `reserved` (pencairan ditahan) |
| `refunded` | Admin memutuskan refund pada sengketa | `active` (atau `removed` jika bermasalah) |
| `expired` | Tidak dibayar > 1 jam | `active` |
| `cancelled` | Dibatalkan pembeli sebelum bayar | `active` |

---

## 6. Pembayaran, Ekonomi Transaksi & Kepatuhan

### Keputusan Arsitektur Pembayaran (Opsi A — Standard Gateway + Ledger)
* **Abstraksi Wajib:** Seluruh integrasi pembayaran wajib dibungkus di balik antarmuka `PaymentProvider` (`createInvoice`, `verifyWebhook`, `processRefund`) agar penyedia dapat diganti tanpa merombak logika aplikasi.
* **Mengapa Bukan Xendit XenPlatform (Opsi B):** Berdasarkan halaman resmi [Biaya Xendit](https://www.xendit.co/id/biaya/) dan [Kebijakan Harga Xendit](https://help.xendit.co/hc/en-us/articles/59516240127129-Xendit-Pricing-Policy) (berlaku sejak Oktober–November 2026), XenPlatform mengenakan biaya aktivasi **USD 10.000**, biaya bulanan **USD 7.500/bulan**, serta **USD 15/sub-akun** untuk KYC. Selain itu, Xendit standar kini mengenakan **Processing Fee Rp 4.000/transaksi** (masuk, keluar, refund) dan **Monthly Minimum Fee Rp 900.000/bulan** jika ada transaksi, serta mewajibkan badan hukum minimal Perseroan Perorangan ([Pusat Bantuan Xendit](https://help.xendit.co/hc/id/articles/360035083911-Apakah-bisnis-individual-perorangan-bisa-menggunakan-layanan-Xendit)). Ini tidak sesuai dengan batasan modal kecil dan barang harga Rp 15.000–Rp 85.000.
* **Rekomendasi Gateway MVP:** Gunakan gateway tanpa biaya setup/bulanan minimum seperti [Midtrans](https://midtrans.com/id/biaya) (QRIS 0,7%) atau [DOKU](https://www.doku.com/harga), dengan **pencairan dana penjual dicatat di tabel `payout_ledger`** lalu ditransfer secara berkala/manual oleh admin melalui panel admin (atau dengan batas minimum penarikan saldo agar margin barang murah tidak habis oleh biaya transfer bank).
* **Aturan Bahasa UI (Kepatuhan Hukum):** Jangan menggunakan kata **"escrow"** di antarmuka pengguna maupun materi promosi sebelum ada konsultasi hukum. Gunakan istilah **"Dana Ditahan Sementara"** atau **"Perlindungan Transaksi"**.

---

## 7. Struktur Halaman & Spesifikasi UI

1. **`/` (Beranda & Katalog):**
   * *Header:* Logo `[Nama Produk]`, bilah pencarian teks (judul/deskripsi), tombol Masuk / Profil + tombol `+ Jual Barang`.
   * *Filter Bar:* Pilihan kategori (`Semua`, `Parfum`, `Aksesoris`, `Elektronik`, `Lainnya`) + filter kondisi.
   * *Grid Kartu Barang (2 kolom di mobile, 4 kolom di desktop):* Foto rasio `1:1`, harga (`Rp 85.000`), judul singkat (maks. 2 baris), badge kondisi (`Seperti baru ✓` / `Bekas baik ✓`), dan nama titik temu.
2. **`/items/[id]` (Halaman Detail Barang):**
   * Galeri foto (geser di mobile), harga, badge kondisi, kategori, titik temu kampus, deskripsi lengkap, nama depan penjual + status verifikasi kampus.
   * Tombol utama **"Beli Sekarang"** (nonaktif/tersembunyi jika milik sendiri atau status bukan `active`), tombol sekunder **"Bagikan ke WhatsApp"**, dan tautan **"Laporkan Barang"**.
   * Wajib menyertakan *OpenGraph metadata* (`og:title`, `og:description`, `og:image`, `og:url`) agar tautan tampil menarik di WhatsApp.
3. **`/sell` & `/items/[id]/edit` (Form Pasang & Ubah Barang):**
   * **Validasi Foto:** Minimal 1 foto, maksimal 4 foto; format `.jpg`, `.jpeg`, `.png`, `.webp`; ukuran maksimal **5 MB per foto** (kompresi sisi klien sebelum unggah ke Supabase Storage).
   * **Isian Form:** Judul (5–80 karakter), Kategori (`Parfum`, `Aksesoris`, `Elektronik`, `Lainnya`), Kondisi (`Seperti baru`, `Bekas baik`, `Bekas layak pakai`), Harga (angka bulat IDR, minimal `[Rp 10.000 / belum diputuskan]`), Titik Temu (pilihan dropdown daftar titik temu kampus + catatan opsional), Deskripsi (20–1.000 karakter).
4. **`/orders` & `/orders/[id]` (Riwayat & Detail Pesanan):**
   * Tab *Pembelian* dan *Penjualan*.
   * Di halaman detail pesanan berstatus `paid_held`: tampilkan kotak informasi titik temu, tombol **"Chat Penjual via WhatsApp"** (`wa.me/62...`), tombol **"Barang Diterima"**, tombol **"Laporkan Masalah"**, serta hitung mundur *auto-release* 72 jam.
5. **`/admin` (Panel Admin Sederhana — Khusus Role `admin`):**
   * **Tab Antrean Verifikasi:** Daftar pengguna alumni/dosen yang mengunggah bukti identitas (Setujui / Tolak dengan alasan).
   * **Tab Pesanan & Sengketa:** Daftar pesanan `disputed` dengan tombol putusan `Refund ke Pembeli` atau `Cairkan ke Penjual`.
   * **Tab Pencairan Dana (`Payout`):** Daftar saldo penjual berstatus `ready_to_payout` beserta nomor rekening/e-wallet untuk ditransfer dan ditandai `paid_out`.
   * **Tab Laporan:** Daftar laporan barang palsu/terlarang dengan tombol `Turunkan Barang` atau `Suspend Pengguna`.

---

## 8. Skema Database (Supabase / PostgreSQL)

Gunakan UUID sebagai *primary key* dan aktifkan *Row Level Security (RLS)* di seluruh tabel.

* **`campuses`**: `id`, `name`, `slug`, `allowed_email_domains` (text[]), `meeting_points` (text[]), `is_active`, `created_at`.
* **`profiles`**: `id` (FK ke `auth.users`), `campus_id` (FK), `full_name`, `role` (`member` | `admin`), `user_type` (`student` | `lecturer` | `alumni`), `verification_status` (`pending` | `verified` | `rejected`), `verification_doc_url` (private), `whatsapp_number`, `payout_method` (bank/e-wallet), `payout_account_number`, `payout_account_name`, `is_suspended`, `created_at`.
* **`listings`**: `id`, `campus_id` (FK), `seller_id` (FK ke `profiles`), `title`, `description`, `category` (`parfum` | `aksesoris` | `elektronik` | `lainnya`), `condition` (`like_new` | `good` | `fair`), `price_idr` (integer), `meeting_point`, `image_urls` (text[]), `status` (`active` | `reserved` | `sold` | `removed`), `created_at`, `updated_at`.
* **`orders`**: `id`, `campus_id` (FK), `listing_id` (FK), `buyer_id` (FK), `seller_id` (FK), `item_price_idr`, `platform_fee_idr`, `gateway_fee_idr`, `total_paid_idr`, `seller_net_idr`, `payment_provider`, `payment_reference`, `payment_url`, `status`, `paid_at`, `auto_release_at`, `completed_at`, `created_at`.
* **`disputes`**: `id`, `order_id` (FK), `opened_by` (FK), `reason`, `evidence_urls` (text[]), `resolution` (`pending` | `refund_buyer` | `release_seller`), `admin_notes`, `resolved_by` (FK), `resolved_at`, `created_at`.
* **`payout_ledger`**: `id`, `order_id` (FK), `seller_id` (FK), `amount_idr`, `status` (`pending_release` | `ready_to_payout` | `paid_out`), `transfer_reference`, `paid_at`, `created_at`.
* **`reports`**: `id`, `reporter_id` (FK), `target_listing_id` (FK nullable), `target_user_id` (FK nullable), `reason`, `status` (`open` | `resolved` | `dismissed`), `created_at`.

---

## 9. Stack Teknologi, Notifikasi & Penanganan Error

### Rekomendasi Stack & Library (Untuk Antigravity)
* **Framework:** Next.js 15+ (App Router, TypeScript).
* **Styling & UI:** Tailwind CSS + shadcn/ui + Lucide Icons.
* **Backend & Auth:** Supabase (`@supabase/ssr`, PostgreSQL, Storage, Edge Functions / Cron untuk auto-expire 1 jam dan auto-release 72 jam).
* **Validasi & Form:** `zod` + `react-hook-form`.
* **Kompresi Gambar Klien:** `browser-image-compression`.
* **Email Transaksional:** Resend (atau SMTP gratis/murah di awal).
* **PWA:** Manifest dasar + ikon agar dapat dipasang ke *home screen* HP tanpa app store.
* **Hosting:** Vercel.

### Format Notifikasi Email Wajib
1. **Pembayaran Diterima (ke Penjual & Pembeli):** Nomor pesanan, nama barang, nominal ditahan, titik temu, dan instruksi menghubungi via WhatsApp.
2. **Pengingat Konfirmasi H+2 (ke Pembeli):** Pengingat bahwa dana akan otomatis diteruskan ke penjual dalam 24 jam jika tombol "Barang Diterima" atau "Laporkan Masalah" tidak ditekan.
3. **Sengketa Dibuka (ke Penjual, Pembeli, Admin):** Ringkasan alasan laporan dan informasi bahwa pencairan ditahan sementara.
4. **Dana Dicairkan (ke Penjual):** Nominal bersih yang ditransfer dan referensi transfer.

### Pesan Error Standar
* **Barang baru saja dipesan orang lain:** `"Maaf, barang ini sedang dalam proses pembayaran oleh pembeli lain. Silakan cek kembali beberapa saat lagi."`
* **Domain email tidak sesuai kampus:** `"Gunakan email resmi kampus yang terdaftar, atau pilih jalur verifikasi alumni/dosen."`
* **Penjual belum melengkapi data pencairan:** `"Lengkapi nomor WhatsApp dan rekening pencairan terlebih dahulu sebelum memasang barang."`
* **Ukuran/format foto tidak valid:** `"Format foto harus JPG/PNG/WebP dengan ukuran maksimal 5 MB per foto."`

---

## 10. Keputusan Terbuka (Wajib Diisi Pendiri Sebelum Go-Live)

Bagian ini dapat diisi nilai default sementara saat coding di Antigravity, lalu dikunci sebelum peluncuran publik:
1. **Nama Produk & Domain Final:** `[Isi nama pilihan, mis. TelyuLoop]`
2. **Besaran Komisi & Penanggung Biaya Gateway:** `[Mis. Komisi platform 3% dari penjual; biaya QRIS 0,7% ditanggung pembeli saat checkout]`
3. **Batas Harga Minimum Barang & Minimum Payout:** `[Mis. Harga barang min. Rp 15.000; pencairan saldo penjual min. Rp 50.000 atau akumulatif mingguan]`
4. **Target Keberhasilan 3 Bulan Pertama:** `[Mis. 50 transaksi sukses, 30 penjual aktif, 0 sengketa tidak terselesaikan]`
