-- =====================================================================
-- LapakTelu — 0007 Penjadwalan (pg_cron)
-- Jaring pengaman berbasis database: tetap berjalan walau server
-- aplikasi tidak memanggil /api/cron/tick.
--   * expire_unpaid_orders : tiap 5 menit  (batas bayar 1 jam)
--   * auto_release_orders  : tiap 10 menit (auto-release 72 jam)
-- Email pengingat H+2 dikirim oleh /api/cron/tick (lihat README).
-- =====================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'lapaktelu-expire-unpaid-orders',
  '*/5 * * * *',
  $$select public.expire_unpaid_orders();$$
);

select cron.schedule(
  'lapaktelu-auto-release-orders',
  '*/10 * * * *',
  $$select public.auto_release_orders();$$
);
