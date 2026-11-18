-- =====================================================================
-- LapakTelu — 0001 Skema inti
-- Semua PK memakai UUID. Setiap user, listing, dan order terikat ke
-- satu campus_id (arsitektur multi-kampus, PRD §4).
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------
create type public.user_role           as enum ('member', 'admin');
create type public.user_type           as enum ('student', 'lecturer', 'alumni');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.listing_category    as enum ('parfum', 'aksesoris', 'elektronik', 'lainnya');
create type public.listing_condition   as enum ('like_new', 'good', 'fair');
create type public.listing_status      as enum ('active', 'reserved', 'sold', 'removed');
create type public.order_status        as enum (
  'pending_payment', 'paid_held', 'completed', 'disputed', 'refunded', 'expired', 'cancelled'
);
create type public.dispute_resolution  as enum ('pending', 'refund_buyer', 'release_seller');
-- 'cancelled' adalah tambahan dari PRD: entri ledger yang dibatalkan karena refund
-- tetap disimpan (jejak audit) alih-alih dihapus.
create type public.payout_status       as enum ('pending_release', 'ready_to_payout', 'paid_out', 'cancelled');
create type public.report_status       as enum ('open', 'resolved', 'dismissed');

-- ---------------------------------------------------------------------
-- Util: updated_at otomatis
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- campuses — data konfigurasi kampus
-- ---------------------------------------------------------------------
create table public.campuses (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  allowed_email_domains text[] not null default '{}',
  meeting_points        text[] not null default '{}',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles — 1:1 dengan auth.users
-- ---------------------------------------------------------------------
create table public.profiles (
  id                            uuid primary key references auth.users (id) on delete cascade,
  campus_id                     uuid not null references public.campuses (id),
  email                         text not null,
  full_name                     text not null check (char_length(full_name) between 2 and 80),
  role                          public.user_role not null default 'member',
  user_type                     public.user_type not null,
  verification_status           public.verification_status not null default 'pending',
  verification_doc_url          text,              -- path di bucket privat verification-docs
  verification_rejection_reason text,
  whatsapp_number               text check (whatsapp_number ~ '^628[0-9]{7,12}$'),
  payout_method                 text,              -- kode bank / e-wallet, mis. 'bca', 'gopay'
  payout_account_number         text check (payout_account_number ~ '^[0-9]{6,20}$'),
  payout_account_name           text check (char_length(payout_account_name) between 2 and 80),
  is_suspended                  boolean not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index profiles_campus_idx on public.profiles (campus_id);
create index profiles_verification_queue_idx on public.profiles (created_at)
  where verification_status = 'pending' and verification_doc_url is not null;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- listings — barang yang dijual (selalu 1 unit)
-- ---------------------------------------------------------------------
create table public.listings (
  id                 uuid primary key default gen_random_uuid(),
  campus_id          uuid not null references public.campuses (id),
  seller_id          uuid not null,
  title              text not null check (char_length(title) between 5 and 80),
  description        text not null check (char_length(description) between 20 and 1000),
  category           public.listing_category not null,
  condition          public.listing_condition not null,
  -- Batas minimum harga: sinkronkan dengan MIN_LISTING_PRICE_IDR di src/config/business.ts
  price_idr          integer not null check (price_idr >= 10000 and price_idr <= 100000000),
  meeting_point      text not null check (char_length(meeting_point) between 2 and 120),
  meeting_point_note text check (char_length(meeting_point_note) <= 160),
  image_urls         text[] not null check (cardinality(image_urls) between 1 and 4),
  status             public.listing_status not null default 'active',
  -- Diisi saat admin menurunkan barang; penjual tidak bisa mengaktifkannya kembali.
  taken_down_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint listings_seller_id_fkey foreign key (seller_id) references public.profiles (id)
);

create index listings_catalog_idx on public.listings (campus_id, status, created_at desc);
create index listings_seller_idx  on public.listings (seller_id, created_at desc);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index listings_description_trgm_idx on public.listings using gin (description gin_trgm_ops);

create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- orders — satu transaksi = satu barang
-- ---------------------------------------------------------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  campus_id         uuid not null references public.campuses (id),
  listing_id        uuid not null,
  buyer_id          uuid not null,
  seller_id         uuid not null,
  item_price_idr    integer not null check (item_price_idr > 0),
  platform_fee_idr  integer not null check (platform_fee_idr >= 0),
  gateway_fee_idr   integer not null check (gateway_fee_idr >= 0),
  total_paid_idr    integer not null check (total_paid_idr > 0),
  seller_net_idr    integer not null check (seller_net_idr >= 0),
  payment_provider  text not null,
  payment_reference text,
  payment_url       text,
  status            public.order_status not null default 'pending_payment',
  expires_at        timestamptz not null default (now() + interval '1 hour'),
  paid_at           timestamptz,
  auto_release_at   timestamptz,
  reminder_sent_at  timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  refunded_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint orders_listing_id_fkey foreign key (listing_id) references public.listings (id),
  constraint orders_buyer_id_fkey   foreign key (buyer_id)   references public.profiles (id),
  constraint orders_seller_id_fkey  foreign key (seller_id)  references public.profiles (id),
  constraint orders_not_self check (buyer_id <> seller_id),
  constraint orders_amounts_consistent check (
    total_paid_idr = item_price_idr + gateway_fee_idr
    and seller_net_idr = item_price_idr - platform_fee_idr
  )
);

-- Jaminan tingkat database: satu barang hanya boleh punya satu pesanan "hidup".
create unique index orders_one_open_per_listing
  on public.orders (listing_id)
  where status in ('pending_payment', 'paid_held', 'disputed');

create index orders_campus_idx on public.orders (campus_id);
create index orders_buyer_idx  on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where status = 'pending_payment';
create index orders_release_idx on public.orders (auto_release_at) where status = 'paid_held';
create unique index orders_payment_reference_idx on public.orders (payment_provider, payment_reference)
  where payment_reference is not null;

-- ---------------------------------------------------------------------
-- disputes — maksimal satu sengketa per pesanan
-- ---------------------------------------------------------------------
create table public.disputes (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique,
  opened_by     uuid not null,
  reason        text not null check (char_length(reason) between 10 and 1000),
  evidence_urls text[] not null default '{}' check (cardinality(evidence_urls) <= 10),
  resolution    public.dispute_resolution not null default 'pending',
  admin_notes   text,
  resolved_by   uuid,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint disputes_order_id_fkey    foreign key (order_id)    references public.orders (id),
  constraint disputes_opened_by_fkey   foreign key (opened_by)   references public.profiles (id),
  constraint disputes_resolved_by_fkey foreign key (resolved_by) references public.profiles (id)
);

create index disputes_open_idx on public.disputes (created_at) where resolution = 'pending';
create index disputes_opened_by_idx on public.disputes (opened_by);
create index disputes_resolved_by_idx on public.disputes (resolved_by);

-- ---------------------------------------------------------------------
-- payout_ledger — buku besar pencairan dana penjual
-- ---------------------------------------------------------------------
create table public.payout_ledger (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null unique,
  seller_id          uuid not null,
  amount_idr         integer not null check (amount_idr >= 0),
  status             public.payout_status not null default 'pending_release',
  transfer_reference text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  constraint payout_ledger_order_id_fkey  foreign key (order_id)  references public.orders (id),
  constraint payout_ledger_seller_id_fkey foreign key (seller_id) references public.profiles (id)
);

create index payout_ledger_seller_status_idx on public.payout_ledger (seller_id, status);

-- ---------------------------------------------------------------------
-- reports — laporan barang/pengguna bermasalah
-- ---------------------------------------------------------------------
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null,
  target_listing_id uuid,
  target_user_id    uuid,
  reason            text not null check (char_length(reason) between 10 and 500),
  status            public.report_status not null default 'open',
  resolved_by       uuid,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint reports_reporter_id_fkey       foreign key (reporter_id)       references public.profiles (id),
  constraint reports_target_listing_id_fkey foreign key (target_listing_id) references public.listings (id),
  constraint reports_target_user_id_fkey    foreign key (target_user_id)    references public.profiles (id),
  constraint reports_resolved_by_fkey       foreign key (resolved_by)       references public.profiles (id),
  constraint reports_has_target check (target_listing_id is not null or target_user_id is not null)
);

create index reports_open_idx on public.reports (created_at) where status = 'open';
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_target_listing_idx on public.reports (target_listing_id);
create index reports_target_user_idx on public.reports (target_user_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
-- Cegah spam: satu pelapor hanya bisa punya satu laporan terbuka per barang.
create unique index reports_one_open_per_listing
  on public.reports (reporter_id, target_listing_id)
  where status = 'open' and target_listing_id is not null;
