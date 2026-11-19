-- =====================================================================
-- TeLapak — 0012 Chat In-App, Make Offer (Tawar Harga), & Rating/Review 1-5 Bintang
-- =====================================================================

create type public.message_type as enum ('text', 'offer', 'system');
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'superseded');

-- ---------------------------------------------------------------------
-- 1. conversations — ruang diskusi & negosiasi per (listing, buyer)
-- ---------------------------------------------------------------------
create table public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  campus_id          uuid not null references public.campuses (id),
  listing_id         uuid not null references public.listings (id) on delete cascade,
  buyer_id           uuid not null references public.profiles (id) on delete cascade,
  seller_id          uuid not null references public.profiles (id) on delete cascade,
  accepted_offer_idr integer check (accepted_offer_idr is null or (accepted_offer_idr >= 10000 and accepted_offer_idr <= 100000000)),
  last_message_text  text not null default '',
  last_message_at    timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  constraint conversations_not_self check (buyer_id <> seller_id),
  constraint conversations_unique_listing_buyer unique (listing_id, buyer_id)
);

create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);
create index conversations_campus_idx on public.conversations (campus_id);

-- ---------------------------------------------------------------------
-- 2. messages — pesan teks maupun kartu tawaran harga (Make Offer)
-- ---------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  message_type     public.message_type not null default 'text',
  body             text not null check (char_length(body) between 1 and 1000),
  offer_amount_idr integer check (offer_amount_idr is null or (offer_amount_idr >= 10000 and offer_amount_idr <= 100000000)),
  offer_status     public.offer_status,
  created_at       timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index messages_sender_idx on public.messages (sender_id);

-- ---------------------------------------------------------------------
-- 3. reviews — rating bintang 1-5 & ulasan pembeli setelah pesanan selesai
-- ---------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders (id) on delete cascade,
  listing_id  uuid not null references public.listings (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text not null check (char_length(comment) between 5 and 600),
  created_at  timestamptz not null default now()
);

create index reviews_seller_idx on public.reviews (seller_id, created_at desc);
create index reviews_listing_idx on public.reviews (listing_id, created_at desc);
create index reviews_reviewer_idx on public.reviews (reviewer_id);

-- ---------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.reviews       enable row level security;

create policy "conversations_select_participant_or_admin"
  on public.conversations for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
    or (select app_private.is_admin())
  );

revoke insert, update, delete on public.conversations from anon, authenticated;

create policy "messages_select_participant_or_admin"
  on public.messages for select to authenticated
  using (
    (select app_private.is_admin())
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
  );

revoke insert, update, delete on public.messages from anon, authenticated;

-- Ulasan bersifat publik untuk dibaca semua orang; penulisan dilakukan lewat server action tervalidasi
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

revoke insert, update, delete on public.reviews from anon, authenticated;

-- ---------------------------------------------------------------------
-- Perbarui create_order agar otomatis memakai accepted_offer_idr bila
-- penjual sudah menyetujui tawaran harga (Make Offer) dari pembeli tersebut.
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
  v_buyer           public.profiles;
  v_listing         public.listings;
  v_order           public.orders;
  v_accepted_offer  integer;
  v_effective_price integer;
  v_platform_fee    integer;
  v_gateway_fee     integer;
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

  select * into v_order
    from public.orders
   where listing_id = p_listing_id
     and buyer_id = p_buyer_id
     and status = 'pending_payment'
     and expires_at > now();
  if found then
    return v_order;
  end if;

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

  -- Cek apakah ada harga tawaran (Make Offer) yang telah disetujui untuk pembeli ini
  select accepted_offer_idr into v_accepted_offer
    from public.conversations
   where listing_id = p_listing_id
     and buyer_id = p_buyer_id;

  v_effective_price := coalesce(v_accepted_offer, v_listing.price_idr);
  v_platform_fee := round(v_effective_price * p_platform_fee_bps / 10000.0);
  v_gateway_fee  := ceil(v_effective_price * p_gateway_fee_bps / 10000.0);

  insert into public.orders (
    campus_id, listing_id, buyer_id, seller_id,
    item_price_idr, platform_fee_idr, gateway_fee_idr, total_paid_idr, seller_net_idr,
    payment_provider, expires_at
  ) values (
    v_listing.campus_id, v_listing.id, p_buyer_id, v_listing.seller_id,
    v_effective_price, v_platform_fee, v_gateway_fee,
    v_effective_price + v_gateway_fee, v_effective_price - v_platform_fee,
    p_provider, now() + p_payment_ttl
  )
  returning * into v_order;

  update public.listings set status = 'reserved' where id = p_listing_id;

  return v_order;
end;
$$;

revoke execute on function public.create_order(uuid, uuid, integer, integer, text, interval) from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, integer, integer, text, interval) to service_role;
