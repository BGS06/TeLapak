-- =====================================================================
-- LapakTelu — 0009 Seed akun civitas & katalog awal Tel-U Surabaya
-- Password seluruh akun demo: LapakTelu123!
--   1. nadia@student.telkomuniversity.ac.id (Mahasiswa & Penjual Tingkat 2)
--   2. raka@student.telkomuniversity.ac.id  (Mahasiswa & Pembeli/Penjual Tingkat 2)
--   3. dimas.alumni@gmail.com               (Alumni Terverifikasi & Penjual Tingkat 2)
--   4. admin@telkomuniversity.ac.id         (Dosen & Admin Panel Moderasi)
-- =====================================================================

do $$
declare
  v_campus_id uuid;
  v_nadia_id  uuid := '00000000-0000-4000-8000-000000000102';
  v_raka_id   uuid := '00000000-0000-4000-8000-000000000101';
  v_dimas_id  uuid := '00000000-0000-4000-8000-000000000103';
  v_admin_id  uuid := '00000000-0000-4000-8000-000000000104';
  v_pw_hash   text := extensions.crypt('LapakTelu123!', extensions.gen_salt('bf'));
  u           record;
begin
  select id into v_campus_id from public.campuses where slug = 'tel-u-surabaya' limit 1;
  if v_campus_id is null then
    return;
  end if;

  for u in
    select * from (values
      (v_nadia_id, 'nadia@student.telkomuniversity.ac.id', 'Nadia Putri Pratama', 'student'),
      (v_raka_id,  'raka@student.telkomuniversity.ac.id',  'Raka Pratama Wijaya', 'student'),
      (v_dimas_id, 'dimas.alumni@gmail.com',               'Dimas Aditya',        'alumni'),
      (v_admin_id, 'admin@telkomuniversity.ac.id',         'Alya Rahmawati',      'lecturer')
    ) as t(id, email, full_name, user_type)
  loop
    if not exists (select 1 from auth.users where id = u.id or email = u.email) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000',
        u.id,
        'authenticated',
        'authenticated',
        u.email,
        v_pw_hash,
        now(),
        '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'campus_id', v_campus_id::text,
          'full_name', u.full_name,
          'user_type', u.user_type
        ),
        now(),
        now()
      );

      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(),
        u.id,
        u.id::text,
        jsonb_build_object(
          'sub', u.id::text,
          'email', u.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        now(),
        now(),
        now()
      );
    end if;
  end loop;

  -- Lengkapi data Tingkat 2 (WhatsApp + rekening pencairan) & role admin
  update public.profiles
     set whatsapp_number       = '6281234567890',
         payout_method         = 'bca',
         payout_account_number = '8210948271',
         payout_account_name   = 'Nadia Putri Pratama',
         verification_status   = 'verified'
   where id = v_nadia_id;

  update public.profiles
     set whatsapp_number       = '6281298765432',
         payout_method         = 'gopay',
         payout_account_number = '081298765432',
         payout_account_name   = 'Raka Pratama Wijaya',
         verification_status   = 'verified'
   where id = v_raka_id;

  update public.profiles
     set whatsapp_number       = '6281355667788',
         payout_method         = 'mandiri',
         payout_account_number = '1420098765432',
         payout_account_name   = 'Dimas Aditya',
         verification_status   = 'verified'
   where id = v_dimas_id;

  update public.profiles
     set role                  = 'admin',
         whatsapp_number       = '6281133445566',
         payout_method         = 'bni',
         payout_account_number = '0987654321',
         payout_account_name   = 'Alya Rahmawati',
         verification_status   = 'verified'
   where id = v_admin_id;

  -- Seed 6 barang bekas katalog awal Telkom University Surabaya
  insert into public.listings (
    id, campus_id, seller_id, title, description, category, condition, price_idr,
    meeting_point, meeting_point_note, image_urls, status
  ) values
  (
    '00000000-0000-4000-8000-000000000201',
    v_campus_id,
    v_nadia_id,
    'HMNS Orgasm EDP 100ml (Sisa 85%, Box Lengkap)',
    'Beli langsung di official store HMNS bulan lalu. Sisa sekitar 85% sesuai garis botol di foto, sprayer masih sangat halus, batch code tembus di kardus. Dijual karena ganti aroma yang lebih fresh untuk kuliah pagi.',
    'parfum',
    'like_new',
    215000,
    'Lobi Gedung Utama',
    'Senin–Jumat jam 12.00–13.30 sehabis kelas',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f6efe9%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23b3261e%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23b3261e%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23b3261e%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20PARFUM%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EHMNS%20Orgasm%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EEDP%20100ml%20%E2%80%A2%20Sisa%2085%25%20%2B%20Box%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    v_campus_id,
    v_raka_id,
    'Kalkulator Ilmiah Casio FX-991EX ClassWiz Original',
    'Dipakai 2 semester untuk Kalkulus dan Statistika. Semua tombol responsif, layar bersih tanpa dead pixel, tutup geser masih rapat. Sudah termasuk baterai baru.',
    'elektronik',
    'good',
    165000,
    'Perpustakaan',
    'Meja baca lantai 1 dekat loker',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23eef2f6%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%231e3a8a%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%231e3a8a%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%231e3a8a%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20ELEKTRONIK%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3ECasio%20FX-991EX%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EClassWiz%20%E2%80%A2%20Normal%20100%25%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    v_campus_id,
    v_dimas_id,
    'Mouse Wireless Logitech M331 Silent Plus + Receiver',
    'Klik senyap cocok dipakai di perpustakaan atau ruang lab. Scroll wheel aman tidak loncat, receiver USB original tersimpan di slot bawah mouse. Minus pemakaian wajar di grip samping.',
    'elektronik',
    'good',
    85000,
    'Kantin Kampus',
    'Area meja tengah dekat booth kopi',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23eef4f0%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%2314532d%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%2314532d%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%2314532d%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20ELEKTRONIK%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3ELogitech%20M331%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3ESilent%20Click%20%E2%80%A2%20USB%20Receiver%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    v_campus_id,
    v_nadia_id,
    'Kahf Revered Oud Eau de Toilette 35ml (2x Semprot)',
    'Baru beli minggu lalu di Indomaret Ketintang, baru disemprot 2 kali untuk coba wangi. Botol dan box mulus seperti baru keluar toko.',
    'parfum',
    'like_new',
    48000,
    'Lobi Gedung Utama',
    null,
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f5f2eb%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23713f12%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23713f12%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23713f12%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20PARFUM%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EKahf%20Revered%20Oud%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EEDT%2035ml%20%E2%80%A2%2098%25%20Penuh%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    v_campus_id,
    v_nadia_id,
    'Sleeve Laptop 14 Inci Waterproof Abu Tua + Pouch Charger',
    'Muat ThinkPad/MacBook/ASUS 14 inci. Busa dalam tebal dan halus, resleting YKK lancar, bonus pouch kecil untuk charger dan mouse.',
    'aksesoris',
    'like_new',
    55000,
    'Area Parkir Mahasiswa',
    'Dekat pos keluar motor',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f1f0ee%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23374151%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23374151%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23374151%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20AKSESORIS%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3ESleeve%20Laptop%2014%22%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EBusa%20Tebal%20%2B%20Pouch%20Charger%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000206',
    v_campus_id,
    v_admin_id,
    'Buku Clean Architecture & Designing Data-Intensive Apps',
    'Paket 2 buku referensi wajib mahasiswa Informatika/RPL. Kertas bersih, tidak ada coretan stabilo, sampul sudah disampul plastik rapi.',
    'lainnya',
    'good',
    120000,
    'Perpustakaan',
    'Jam kerja 09.00–16.00',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f7f1ec%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%239a3412%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%239a3412%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%239a3412%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20BUKU%20KULIAH%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EPaket%202%20Buku%20RPL%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EClean%20Arch%20%2B%20DDIA%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  )
  on conflict (id) do nothing;
end;
$$;
