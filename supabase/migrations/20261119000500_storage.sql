-- =====================================================================
-- LapakTelu — 0005 Supabase Storage
--   listing-images     : publik  — foto barang  ({user_id}/{file})
--   verification-docs  : privat  — bukti alumni/dosen, dihapus setelah diverifikasi
--   dispute-evidence   : privat  — bukti sengketa ({user_id}/{order_id}/{file})
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images',    'listing-images',    true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('dispute-evidence',  'dispute-evidence',  false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- listing-images ------------------------------------------------------
create policy "listing_images_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_member())
  );

create policy "listing_images_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- verification-docs ---------------------------------------------------
create policy "verification_docs_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "verification_docs_select_own_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- dispute-evidence ----------------------------------------------------
create policy "dispute_evidence_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dispute-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "dispute_evidence_select_own_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dispute-evidence'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
