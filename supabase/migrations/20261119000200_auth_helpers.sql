-- =====================================================================
-- LapakTelu — 0002 Helper auth, pembuatan profil, dan guard
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper peran (SECURITY DEFINER agar bisa dipakai di dalam policy
-- tanpa memicu rekursi RLS pada tabel profiles).
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_suspended
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and not is_suspended
  );
$$;

create or replace function public.current_campus_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select campus_id from public.profiles where id = auth.uid();
$$;

-- Tingkat 2 (PRD §3): syarat menjadi penjual.
create or replace function public.can_sell(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and verification_status = 'verified'
      and not is_suspended
      and whatsapp_number is not null
      and payout_method is not null
      and payout_account_number is not null
      and payout_account_name is not null
  );
$$;

-- ---------------------------------------------------------------------
-- Profil dibuat otomatis saat user mendaftar.
-- Metadata yang dikirim dari aplikasi: full_name, campus_id, user_type.
--   * Email berdomain kampus  → langsung 'verified' (kepemilikan email
--     dibuktikan lewat konfirmasi email Supabase Auth).
--   * Email pribadi           → 'pending' sampai admin menyetujui bukti.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta            jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_campus          public.campuses;
  v_domain          text  := lower(split_part(new.email, '@', 2));
  v_user_type       public.user_type;
  v_is_campus_email boolean;
  v_full_name       text;
begin
  select * into v_campus
  from public.campuses
  where id = nullif(v_meta ->> 'campus_id', '')::uuid
    and is_active;

  if not found then
    raise exception 'CAMPUS_NOT_FOUND';
  end if;

  v_is_campus_email := exists (
    select 1 from unnest(v_campus.allowed_email_domains) as d where lower(d) = v_domain
  );
  v_user_type := coalesce(nullif(v_meta ->> 'user_type', ''), 'student')::public.user_type;

  -- Mahasiswa aktif wajib memakai email kampus.
  if v_user_type = 'student' and not v_is_campus_email then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED';
  end if;

  v_full_name := nullif(btrim(v_meta ->> 'full_name'), '');

  insert into public.profiles (id, campus_id, email, full_name, user_type, verification_status)
  values (
    new.id,
    v_campus.id,
    lower(new.email),
    coalesce(v_full_name, split_part(new.email, '@', 1)),
    v_user_type,
    case when v_is_campus_email then 'verified' else 'pending' end::public.verification_status
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Guard perubahan listing oleh pengguna biasa.
-- Pengguna hanya boleh mengubah barang berstatus active/removed, dan
-- hanya boleh berpindah di antara active <-> removed. Status reserved/sold
-- dikelola eksklusif oleh fungsi transaksi (service role).
-- ---------------------------------------------------------------------
create or replace function public.listings_guard_user_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'authenticated' then
    return new; -- service role / cron / migrasi
  end if;

  if old.taken_down_at is not null then
    raise exception 'LISTING_TAKEN_DOWN';
  end if;

  if old.status not in ('active', 'removed') then
    raise exception 'LISTING_LOCKED';
  end if;

  if new.status not in ('active', 'removed') then
    raise exception 'LISTING_INVALID_STATUS';
  end if;

  return new;
end;
$$;

create trigger listings_guard_user_update
  before update on public.listings
  for each row execute function public.listings_guard_user_update();

-- ---------------------------------------------------------------------
-- Profil publik: hanya kolom aman. Nama ditampilkan sebagai nama depan
-- (PRD §7). View ini sengaja berjalan dengan hak pemilik (bukan
-- security_invoker) supaya bisa dibaca publik tanpa membuka RLS profiles.
-- ---------------------------------------------------------------------
create view public.public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.campus_id,
  split_part(btrim(p.full_name), ' ', 1) as first_name,
  p.user_type,
  p.verification_status,
  p.created_at
from public.profiles p;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- Kontak penjual hanya terbuka untuk pembeli setelah pembayaran sukses.
-- ---------------------------------------------------------------------
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
    and o.buyer_id = auth.uid()
    and o.status in ('paid_held', 'disputed', 'completed');
$$;

revoke execute on function public.get_seller_contact(uuid) from public, anon;
grant execute on function public.get_seller_contact(uuid) to authenticated;
