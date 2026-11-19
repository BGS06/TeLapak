-- =====================================================================
-- TeLapak — 0013 Penanda pesan belum dibaca (badge notifikasi Chat)
--   * buyer_last_read_at / seller_last_read_at: kapan masing-masing pihak
--     terakhir membuka ruang chat.
--   * get_unread_counts(): jumlah pesan masuk (teks, tawaran, & sistem) yang
--     belum dibaca per percakapan untuk user yang sedang login.
-- =====================================================================

alter table public.conversations
  add column if not exists buyer_last_read_at  timestamptz not null default now(),
  add column if not exists seller_last_read_at timestamptz not null default '1970-01-01T00:00:00Z';

-- Percakapan lama: pesan dari lawan bicara dianggap belum dibaca oleh penjual,
-- sedangkan pembeli dianggap sudah membaca hingga saat migrasi.
update public.conversations
   set buyer_last_read_at = now()
 where buyer_last_read_at is null;

create index if not exists messages_unread_lookup_idx
  on public.messages (conversation_id, created_at, sender_id);

-- SECURITY INVOKER: tunduk pada RLS conversations & messages (hanya peserta).
create or replace function public.get_unread_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.conversation_id, count(*)::bigint as unread_count
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    and m.sender_id <> (select auth.uid())
    and m.created_at > case
      when c.buyer_id = (select auth.uid()) then c.buyer_last_read_at
      else c.seller_last_read_at
    end
  group by m.conversation_id;
$$;

revoke execute on function public.get_unread_counts() from public, anon;
grant execute on function public.get_unread_counts() to authenticated, service_role;
