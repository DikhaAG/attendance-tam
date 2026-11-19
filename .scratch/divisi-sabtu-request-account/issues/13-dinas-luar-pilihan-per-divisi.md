Status: ready-for-agent
Repo: attendance-tam
Blocked by: 11

# 13 — Dinas luar: pilihan karyawan dibatasi ke Divisi supervisor

Spec: `../spec.md` (§2 Dinas luar). User story 40–41.

## Yang dibangun

- Daftar karyawan yang bisa dipilih Supervisor saat membuat Dinas luar
  (`GET /api/users` untuk mobile dan form web) dibatasi ke Divisi Supervisor
  itu. Supervisor tanpa Jabatan melihat semua (seperti sekarang).
- Aksi buat Dinas luar menolak karyawan di luar Divisi Supervisor (validasi
  server, bukan hanya UI).
- Approval Dinas luar tetap oleh Manager — tidak berubah.

## Kriteria selesai

- [ ] Dwiky (Supervisor Teknis) hanya melihat anggota Divisi Teknis di
      pemilih; mengirim id anggota Divisi Admin lewat API ditolak.
- [ ] Mobile 1.1.0 tidak perlu diubah.
- [ ] lint + `tsc --noEmit` hijau.
