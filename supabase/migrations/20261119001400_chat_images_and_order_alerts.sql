-- =====================================================================
-- TeLapak — 0014 Foto di Ruang Chat, Badge Pesanan Aktif, & Index Filter Katalog
--   * messages.image_url : lampiran foto opsional dalam ruang chat
--   * storage bucket chat-attachments : unggah foto chat ({user_id}/{file})
--   * get_pending_orders_count() : jumlah pesanan butuh tindakan (badge Pesanan)
--   * index katalog (harga & titik temu COD) untuk sortir & filter cepat
-- =====================================================================

-- 1. Kolom lampiran foto pada pesan chat
alter table public.messages
  add column if not exists image_url text;

-- 2. Bucket Storage untuk foto chat (maks 5 MB, jpeg/png/webp)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_attachments_insert_own_folder'
  ) then
    create policy "chat_attachments_insert_own_folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'chat-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and (select app_private.is_active_member())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_attachments_delete_own'
  ) then
    create policy "chat_attachments_delete_own"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end $$;

-- 3. Index parsial untuk hitungan pesanan aktif & filter/sortir katalog
create index if not exists orders_active_attention_buyer_idx
  on public.orders (buyer_id, status)
  where status in ('pending_payment', 'paid_held', 'disputed');

create index if not exists orders_active_attention_seller_idx
  on public.orders (seller_id, status)
  where status in ('paid_held', 'disputed');

create index if not exists listings_catalog_price_idx
  on public.listings (campus_id, price_idr)
  where status = 'active';

create index if not exists listings_catalog_meeting_point_idx
  on public.listings (campus_id, meeting_point)
  where status = 'active';

-- 4. Fungsi hitungan badge Pesanan (SECURITY INVOKER — tunduk RLS orders)
--    - Sebagai pembeli: pending_payment (belum bayar), paid_held (COD/konfirmasi), disputed
--    - Sebagai penjual: paid_held (sudah dibayar, siap COD), disputed
create or replace function public.get_pending_orders_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.orders o
  where (
    o.buyer_id = (select auth.uid())
    and o.status in ('pending_payment', 'paid_held', 'disputed')
  )
  or (
    o.seller_id = (select auth.uid())
    and o.status in ('paid_held', 'disputed')
  );
$$;

revoke execute on function public.get_pending_orders_count() from public, anon;
grant execute on function public.get_pending_orders_count() to authenticated, service_role;
