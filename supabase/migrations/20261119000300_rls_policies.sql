-- =====================================================================
-- LapakTelu — 0003 Row Level Security & hak kolom
-- Prinsip: klien hanya boleh MEMBACA data miliknya dan menulis data
-- sederhana (profil, listing, laporan). Semua transisi status pesanan,
-- sengketa, dan pencairan berjalan lewat fungsi SECURITY DEFINER yang
-- hanya bisa dipanggil service role dari server aplikasi.
-- =====================================================================

alter table public.campuses      enable row level security;
alter table public.profiles      enable row level security;
alter table public.listings      enable row level security;
alter table public.orders        enable row level security;
alter table public.disputes      enable row level security;
alter table public.payout_ledger enable row level security;
alter table public.reports       enable row level security;

-- ---------------------------------------------------------------------
-- campuses
-- ---------------------------------------------------------------------
create policy "campuses_select_active"
  on public.campuses for select
  using (is_active or (select public.is_admin()));

revoke insert, update, delete on public.campuses from anon, authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Kolom sensitif (role, status verifikasi, suspend, kampus) tidak bisa
-- diubah pengguna sendiri.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, whatsapp_number, payout_method, payout_account_number, payout_account_name)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------
create policy "listings_select_visible"
  on public.listings for select
  using (
    status in ('active', 'reserved', 'sold')
    or seller_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "listings_insert_eligible_seller"
  on public.listings for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and (select public.can_sell((select auth.uid())))
    and campus_id = (select public.current_campus_id())
  );

create policy "listings_update_own"
  on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) and (select public.is_active_member()))
  with check (seller_id = (select auth.uid()));

revoke insert, update, delete on public.listings from anon, authenticated;
grant insert (campus_id, seller_id, title, description, category, condition, price_idr,
              meeting_point, meeting_point_note, image_urls)
  on public.listings to authenticated;
grant update (title, description, category, condition, price_idr,
              meeting_point, meeting_point_note, image_urls, status)
  on public.listings to authenticated;

-- ---------------------------------------------------------------------
-- orders (read-only bagi klien)
-- ---------------------------------------------------------------------
create policy "orders_select_party_or_admin"
  on public.orders for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
    or (select public.is_admin())
  );

revoke insert, update, delete on public.orders from anon, authenticated;

-- ---------------------------------------------------------------------
-- disputes (read-only bagi klien)
-- ---------------------------------------------------------------------
create policy "disputes_select_party_or_admin"
  on public.disputes for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.orders o
      where o.id = disputes.order_id
        and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
    )
  );

revoke insert, update, delete on public.disputes from anon, authenticated;

-- ---------------------------------------------------------------------
-- payout_ledger (read-only bagi klien)
-- ---------------------------------------------------------------------
create policy "payout_ledger_select_own_or_admin"
  on public.payout_ledger for select to authenticated
  using (seller_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.payout_ledger from anon, authenticated;

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create policy "reports_insert_member"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_active_member()));

create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete on public.reports from anon, authenticated;
grant insert (reporter_id, target_listing_id, target_user_id, reason) on public.reports to authenticated;
