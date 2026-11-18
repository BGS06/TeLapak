-- =====================================================================
-- LapakTelu — 0008 Hardening keamanan (Supabase Security Advisor clean)
--   1. Pindahkan ekstensi pg_trgm ke skema `extensions`.
--   2. Pindahkan helper RLS & trigger SECURITY DEFINER ke skema
--      non-exposed `app_private` menggunakan ALTER FUNCTION ... SET SCHEMA
--      (tanpa DROP; referensi OID pada policy & trigger otomatis terjaga).
--   3. Ubah view `public.public_profiles` menjadi `security_invoker = true`
--      dan batasi `public.get_seller_contact` hanya untuk `service_role`.
-- =====================================================================

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated, service_role;

alter function public.is_admin()          set schema app_private;
alter function public.is_active_member()  set schema app_private;
alter function public.current_campus_id() set schema app_private;
alter function public.can_sell(uuid)      set schema app_private;
alter function public.handle_new_user()   set schema app_private;

revoke execute on function app_private.handle_new_user() from public, anon, authenticated;

alter view public.public_profiles set (security_invoker = true);

create or replace function public.get_seller_contact(p_order_id uuid)
returns table (full_name text, whatsapp_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name, p.whatsapp_number
  from public.orders o
  join public.profiles p on p.id = o.seller_id
  where o.id = p_order_id
    and o.status in ('paid_held', 'disputed', 'completed');
$$;

revoke execute on function public.get_seller_contact(uuid) from public, anon, authenticated;
grant execute on function public.get_seller_contact(uuid) to service_role;
