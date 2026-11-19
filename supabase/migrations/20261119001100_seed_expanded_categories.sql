-- =====================================================================
-- LapakTelu — 0011 Seed barang untuk kategori baru (Buku, Fashion,
-- Sepatu & Tas, Perlengkapan Kos, Hobi & Olahraga, Alat Praktikum)
-- =====================================================================

do $$
declare
  v_campus_id uuid;
  v_nadia_id  uuid := '00000000-0000-4000-8000-000000000102';
  v_raka_id   uuid := '00000000-0000-4000-8000-000000000101';
  v_dimas_id  uuid := '00000000-0000-4000-8000-000000000103';
  v_admin_id  uuid := '00000000-0000-4000-8000-000000000104';
begin
  select id into v_campus_id from public.campuses where slug = 'tel-u-surabaya' limit 1;
  if v_campus_id is null then
    return;
  end if;

  -- Perbarui kategori paket buku RPL menjadi 'buku'
  update public.listings
     set category = 'buku'
   where id = '00000000-0000-4000-8000-000000000206';

  insert into public.listings (
    id, campus_id, seller_id, title, description, category, condition, price_idr,
    meeting_point, meeting_point_note, image_urls, status
  ) values
  (
    '00000000-0000-4000-8000-000000000207',
    v_campus_id,
    v_raka_id,
    'Jaket Varsity Kampus Tel-U Maroon Cream Size L',
    'Jaket varsity tebal bahan fleece cotton bordir rapi. Baru dipakai 3 kali acara himpunan, sudah di-laundry bersih dan wangi, kancing snap besi mulus semua.',
    'fashion',
    'like_new',
    135000,
    'Lobi Gedung Utama',
    'Siang jam 12.00–14.00',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f9f1f0%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23991b1b%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23991b1b%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23991b1b%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20FASHION%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EVarsity%20Tel-U%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EMaroon%20Cream%20%E2%80%A2%20Size%20L%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000208',
    v_campus_id,
    v_dimas_id,
    'Sepatu Ventela Public Low Black Natural Size 42 + Box',
    'Kondisi sol masih tebal 95%, insole empuk ultralite foam belum kempes, kanvas bersih tidak pudar. Cocok buat kuliah harian.',
    'sepatu',
    'good',
    115000,
    'Area Parkir Mahasiswa',
    'Sore jam 15.30–17.00',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23f2f3f5%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%231f2937%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%231f2937%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%231f2937%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20SEPATU%20%26%20TAS%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EVentela%20Public%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EBlack%20Natural%20%E2%80%A2%20Size%2042%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000209',
    v_campus_id,
    v_nadia_id,
    'Lampu Belajar Meja Kos LED Rechargeable 3 Warna + Kabel USB-C',
    'Lampu baca sentuh 3 mode cahaya (warm, natural, white) bisa diatur kecerahannya. Baterai tahan 6 jam, leher fleksibel, sangat membantu buat nugas malam di kos.',
    'kos',
    'like_new',
    45000,
    'Kantin Kampus',
    'Bisa sekalian dicoba nyalanya',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23fef9ec%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23b45309%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23b45309%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23b45309%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20PERLENGKAPAN%20KOS%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3ELampu%20Meja%20LED%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3ERechargeable%20%E2%80%A2%203%20Mode%20Cahaya%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000210',
    v_campus_id,
    v_raka_id,
    'Starter Kit Arduino Uno R3 + Breadboard + Sensor Lengkap',
    'Paket lengkap bekas praktikum IoT & Sistem Tertanam: board Arduino Uno R3 SMD + kabel data, breadboard 830 titik, sensor ultrasonik HC-SR04, DHT11, servo SG90, kabel jumper, dan box sekat.',
    'praktikum',
    'good',
    95000,
    'Perpustakaan',
    'Lantai 1 dekat ruang diskusi',
    array['data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Crect%20width%3D%22800%22%20height%3D%22800%22%20fill%3D%22%23ecfdf5%22%2F%3E%3Ccircle%20cx%3D%22660%22%20cy%3D%22140%22%20r%3D%22180%22%20fill%3D%22%23047857%22%20opacity%3D%220.12%22%2F%3E%3Crect%20x%3D%2288%22%20y%3D%2288%22%20width%3D%22624%22%20height%3D%22624%22%20rx%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23047857%22%20stroke-opacity%3D%220.22%22%20stroke-width%3D%223%22%2F%3E%3Ctext%20x%3D%22128%22%20y%3D%22160%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2222%22%20font-weight%3D%22700%22%20fill%3D%22%23047857%22%20letter-spacing%3D%222%22%3ETEL-U%20SURABAYA%20%E2%80%A2%20ALAT%20PRAKTIKUM%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22420%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2252%22%20font-weight%3D%22800%22%20fill%3D%22%231c1917%22%3EArduino%20IoT%20Kit%3C%2Ftext%3E%3Ctext%20x%3D%22128%22%20y%3D%22476%22%20font-family%3D%22system-ui%2Csans-serif%22%20font-size%3D%2228%22%20font-weight%3D%22500%22%20fill%3D%22%2357534e%22%3EUno%20R3%20%2B%20Sensor%20%2B%20Box%3C%2Ftext%3E%3C%2Fsvg%3E'],
    'active'
  )
  on conflict (id) do nothing;
end;
$$;
