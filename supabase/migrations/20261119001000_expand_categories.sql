-- =====================================================================
-- LapakTelu — 0010 Perluasan kategori barang kampus (10 kategori)
-- Kategori:
--   elektronik, buku, fashion, sepatu, parfum, aksesoris,
--   kos, hobi, praktikum, lainnya
-- =====================================================================

alter type public.listing_category add value if not exists 'buku';
alter type public.listing_category add value if not exists 'fashion';
alter type public.listing_category add value if not exists 'sepatu';
alter type public.listing_category add value if not exists 'kos';
alter type public.listing_category add value if not exists 'hobi';
alter type public.listing_category add value if not exists 'praktikum';
