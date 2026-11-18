-- =====================================================================
-- LapakTelu — 0006 Data kampus peluncuran (PRD §4)
-- Menambah kampus cabang baru cukup dengan INSERT baris baru di sini.
-- =====================================================================

insert into public.campuses (name, slug, allowed_email_domains, meeting_points)
values (
  'Telkom University Surabaya',
  'tel-u-surabaya',
  array['student.telkomuniversity.ac.id', 'telkomuniversity.ac.id'],
  array['Lobi Gedung Utama', 'Kantin Kampus', 'Area Parkir Mahasiswa', 'Perpustakaan']
)
on conflict (slug) do nothing;
