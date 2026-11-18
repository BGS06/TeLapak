-- =====================================================================
-- LapakTelu — 0004 Fungsi transaksi (state machine pesanan, PRD §5)
--
-- Semua fungsi di file ini:
--   * SECURITY DEFINER + search_path kosong,
--   * mengunci baris (FOR UPDATE) dengan urutan listing → order agar
--     aman dari race condition (dua pembeli menekan "Beli" bersamaan),
--   * HANYA dapat dieksekusi oleh service_role (server aplikasi, webhook,
--     cron). Server melakukan autentikasi, lalu meneruskan p_actor.
--
-- Kode error (raise exception '<KODE>') dipetakan ke pesan bahasa
-- Indonesia di src/server/errors.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal: selesaikan pesanan (dipakai konfirmasi pembeli, auto-release
-- 72 jam, dan putusan admin "Cairkan ke Penjual").
-- ---------------------------------------------------------------------
create or replace function public._complete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
begin
  update public.orders
     set status = 'completed', completed_at = now()
   where id = p_order_id
  returning listing_id into v_listing_id;

  update public.listings set status = 'sold' where id = v_listing_id;

  update public.payout_ledger
     set status = 'ready_to_payout'
   where order_id = p_order_id and status = 'pending_release';
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Pembeli klik "Beli" → pending_payment, listing → reserved
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_buyer_id         uuid,
  p_listing_id       uuid,
  p_platform_fee_bps integer,
  p_gateway_fee_bps  integer,
  p_provider         text,
  p_payment_ttl      interval default interval '1 hour'
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer        public.profiles;
  v_listing      public.listings;
  v_order        public.orders;
  v_platform_fee integer;
  v_gateway_fee  integer;
begin
  select * into v_buyer from public.profiles where id = p_buyer_id;
  if not found or v_buyer.is_suspended or v_buyer.verification_status <> 'verified' then
    raise exception 'BUYER_NOT_ELIGIBLE';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.status = 'removed' then
    raise exception 'LISTING_NOT_FOUND';
  end if;
  if v_listing.seller_id = p_buyer_id then
    raise exception 'OWN_LISTING';
  end if;
  if v_listing.campus_id <> v_buyer.campus_id then
    raise exception 'CAMPUS_MISMATCH';
  end if;

  -- Idempoten: klik "Beli" berulang mengembalikan pesanan yang sama.
  select * into v_order
    from public.orders
   where listing_id = p_listing_id
     and buyer_id = p_buyer_id
     and status = 'pending_payment'
     and expires_at > now();
  if found then
    return v_order;
  end if;

  -- Kedaluwarsa "malas": bebaskan reservasi yang sudah lewat batas bayar
  -- tanpa menunggu cron.
  update public.orders
     set status = 'expired'
   where listing_id = p_listing_id
     and status = 'pending_payment'
     and expires_at <= now();
  if found and v_listing.status = 'reserved' then
    update public.listings set status = 'active' where id = p_listing_id;
    v_listing.status := 'active';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'LISTING_UNAVAILABLE';
  end if;

  v_platform_fee := round(v_listing.price_idr * p_platform_fee_bps / 10000.0);
  v_gateway_fee  := ceil(v_listing.price_idr * p_gateway_fee_bps / 10000.0);

  insert into public.orders (
    campus_id, listing_id, buyer_id, seller_id,
    item_price_idr, platform_fee_idr, gateway_fee_idr, total_paid_idr, seller_net_idr,
    payment_provider, expires_at
  ) values (
    v_listing.campus_id, v_listing.id, p_buyer_id, v_listing.seller_id,
    v_listing.price_idr, v_platform_fee, v_gateway_fee,
    v_listing.price_idr + v_gateway_fee, v_listing.price_idr - v_platform_fee,
    p_provider, now() + p_payment_ttl
  )
  returning * into v_order;

  update public.listings set status = 'reserved' where id = p_listing_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Webhook pembayaran sukses → paid_held (dana ditahan sementara)
-- Mengembalikan: 'paid' | 'already_processed' | 'needs_refund'
-- ---------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order_id uuid, p_payment_reference text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_listing    public.listings;
  v_order      public.orders;
begin
  select listing_id into v_listing_id from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select * into v_listing from public.listings where id = v_listing_id for update;
  select * into v_order   from public.orders   where id = p_order_id   for update;

  if v_order.status in ('paid_held', 'completed', 'disputed', 'refunded') then
    return 'already_processed';
  end if;

  -- Pembayaran datang terlambat (pesanan sudah expired/cancelled).
  -- Hidupkan kembali bila barang masih tersedia; kalau tidak, harus refund.
  if v_order.status in ('expired', 'cancelled') and v_listing.status <> 'active' then
    return 'needs_refund';
  end if;

  update public.orders
     set status            = 'paid_held',
         paid_at           = now(),
         auto_release_at   = now() + interval '72 hours',
         cancelled_at      = null,
         payment_reference = coalesce(p_payment_reference, payment_reference)
   where id = p_order_id;

  update public.listings set status = 'reserved' where id = v_listing_id;

  insert into public.payout_ledger (order_id, seller_id, amount_idr, status)
  values (p_order_id, v_order.seller_id, v_order.seller_net_idr, 'pending_release')
  on conflict (order_id) do nothing;

  return 'paid';
end;
$$;

-- Pembayaran terlambat untuk barang yang sudah tidak tersedia → tandai refunded
-- setelah refund di gateway berhasil.
create or replace function public.mark_late_payment_refunded(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
     set status = 'refunded', refunded_at = now()
   where id = p_order_id and status in ('expired', 'cancelled');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Pembeli membatalkan sebelum bayar → cancelled, listing → active
-- ---------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_order      public.orders;
begin
  select listing_id into v_listing_id from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  perform 1 from public.listings where id = v_listing_id for update;
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.buyer_id <> p_actor then
    raise exception 'FORBIDDEN';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception 'INVALID_ORDER_STATE';
  end if;

  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
  update public.listings set status = 'active' where id = v_listing_id and status = 'reserved';
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Cron: pesanan tidak dibayar > batas waktu → expired
-- ---------------------------------------------------------------------
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.orders
       set status = 'expired'
     where status = 'pending_payment'
       and expires_at <= now()
    returning listing_id
  )
  update public.listings l
     set status = 'active'
    from expired e
   where l.id = e.listing_id
     and l.status = 'reserved';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Pembeli klik "Barang Diterima" → completed
-- ---------------------------------------------------------------------
create or replace function public.confirm_order_received(p_order_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_order      public.orders;
begin
  select listing_id into v_listing_id from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  perform 1 from public.listings where id = v_listing_id for update;
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.buyer_id <> p_actor then
    raise exception 'FORBIDDEN';
  end if;
  if v_order.status <> 'paid_held' then
    raise exception 'INVALID_ORDER_STATE';
  end if;

  perform public._complete_order(p_order_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Cron: tidak ada aksi 72 jam → completed otomatis
-- ---------------------------------------------------------------------
create or replace function public.auto_release_orders()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.orders
     where status = 'paid_held' and auto_release_at <= now()
     for update skip locked
  loop
    perform public._complete_order(v_id);
    return next v_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Pembeli klik "Laporkan Masalah" (sebelum 72 jam) → disputed
-- ---------------------------------------------------------------------
create or replace function public.open_dispute(
  p_order_id uuid,
  p_actor    uuid,
  p_reason   text,
  p_evidence text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_order      public.orders;
  v_dispute_id uuid;
begin
  select listing_id into v_listing_id from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  perform 1 from public.listings where id = v_listing_id for update;
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.buyer_id <> p_actor then
    raise exception 'FORBIDDEN';
  end if;
  if v_order.status <> 'paid_held' then
    raise exception 'INVALID_ORDER_STATE';
  end if;
  if v_order.auto_release_at <= now() then
    raise exception 'DISPUTE_WINDOW_CLOSED';
  end if;

  update public.orders set status = 'disputed' where id = p_order_id;

  insert into public.disputes (order_id, opened_by, reason, evidence_urls)
  values (p_order_id, p_actor, p_reason, coalesce(p_evidence, '{}'))
  returning id into v_dispute_id;

  return v_dispute_id;
end;
$$;

-- Kedua pihak dapat menambah bukti selama sengketa belum diputus.
create or replace function public.add_dispute_evidence(p_order_id uuid, p_actor uuid, p_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if p_actor not in (v_order.buyer_id, v_order.seller_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_order.status <> 'disputed' then
    raise exception 'INVALID_ORDER_STATE';
  end if;

  update public.disputes
     set evidence_urls = evidence_urls || p_paths
   where order_id = p_order_id and resolution = 'pending';

  if not found then
    raise exception 'INVALID_ORDER_STATE';
  end if;
exception
  when check_violation then
    raise exception 'EVIDENCE_LIMIT';
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Admin memutus sengketa → refunded | completed
-- ---------------------------------------------------------------------
create or replace function public.resolve_dispute(
  p_order_id       uuid,
  p_admin          uuid,
  p_resolution     public.dispute_resolution,
  p_admin_notes    text,
  p_remove_listing boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing_id uuid;
  v_order      public.orders;
begin
  if not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_resolution = 'pending' then
    raise exception 'INVALID_RESOLUTION';
  end if;

  select listing_id into v_listing_id from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  perform 1 from public.listings where id = v_listing_id for update;
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order.status <> 'disputed' then
    raise exception 'INVALID_ORDER_STATE';
  end if;

  if p_resolution = 'refund_buyer' then
    update public.orders set status = 'refunded', refunded_at = now() where id = p_order_id;

    update public.listings
       set status        = case when p_remove_listing then 'removed' else 'active' end::public.listing_status,
           taken_down_at = case when p_remove_listing then now() else taken_down_at end
     where id = v_listing_id;

    update public.payout_ledger set status = 'cancelled' where order_id = p_order_id;
  else
    perform public._complete_order(p_order_id);
  end if;

  update public.disputes
     set resolution  = p_resolution,
         admin_notes = nullif(btrim(p_admin_notes), ''),
         resolved_by = p_admin,
         resolved_at = now()
   where order_id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Admin menandai saldo penjual sudah ditransfer → paid_out
-- ---------------------------------------------------------------------
create or replace function public.mark_payout_paid(p_seller_id uuid, p_admin uuid, p_transfer_reference text)
returns table (total_idr bigint, entry_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(btrim(p_transfer_reference), '') is null then
    raise exception 'TRANSFER_REFERENCE_REQUIRED';
  end if;

  return query
  with paid as (
    update public.payout_ledger
       set status = 'paid_out', transfer_reference = btrim(p_transfer_reference), paid_at = now()
     where seller_id = p_seller_id and status = 'ready_to_payout'
    returning amount_idr
  )
  select coalesce(sum(amount_idr), 0)::bigint, count(*)::integer from paid;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Admin menindaklanjuti laporan
--     p_action: 'take_down' | 'suspend_user' | 'dismiss'
-- ---------------------------------------------------------------------
create or replace function public.moderate_report(p_report_id uuid, p_admin uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report      public.reports;
  v_target_user uuid;
begin
  if not exists (select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found or v_report.status <> 'open' then
    raise exception 'REPORT_NOT_OPEN';
  end if;

  if p_action = 'take_down' then
    if v_report.target_listing_id is null then
      raise exception 'INVALID_ACTION';
    end if;
    update public.listings
       set status = case when status = 'active' then 'removed' else status end::public.listing_status,
           taken_down_at = now()
     where id = v_report.target_listing_id;

  elsif p_action = 'suspend_user' then
    v_target_user := coalesce(
      v_report.target_user_id,
      (select seller_id from public.listings where id = v_report.target_listing_id)
    );
    update public.profiles set is_suspended = true where id = v_target_user and role <> 'admin';
    update public.listings
       set status = 'removed', taken_down_at = now()
     where seller_id = v_target_user and status = 'active';

  elsif p_action <> 'dismiss' then
    raise exception 'INVALID_ACTION';
  end if;

  update public.reports
     set status      = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end::public.report_status,
         resolved_by = p_admin,
         resolved_at = now()
   where id = p_report_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Hak eksekusi: hanya service_role.
-- ---------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public._complete_order(uuid)',
    'public.create_order(uuid, uuid, integer, integer, text, interval)',
    'public.mark_order_paid(uuid, text)',
    'public.mark_late_payment_refunded(uuid)',
    'public.cancel_order(uuid, uuid)',
    'public.expire_unpaid_orders()',
    'public.confirm_order_received(uuid, uuid)',
    'public.auto_release_orders()',
    'public.open_dispute(uuid, uuid, text, text[])',
    'public.add_dispute_evidence(uuid, uuid, text[])',
    'public.resolve_dispute(uuid, uuid, public.dispute_resolution, text, boolean)',
    'public.mark_payout_paid(uuid, uuid, text)',
    'public.moderate_report(uuid, uuid, text)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
