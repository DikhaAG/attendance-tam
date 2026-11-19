Status: ready-for-agent
Repo: attendance-tam
Blocked by: 11

# 12 — Routing per Divisi untuk approval absen luar radius

Spec: `../spec.md` (§2). ADR 0002. User story 29, 31–33, 38, 42.

## Yang dibangun

Menerapkan modul aturan routing (tiket 11) ke approval absen luar radius:

- Daftar pending absen luar radius di API mobile (`/api/attendance/pending`),
  halaman verifikasi desktop Supervisor/Manager, dan tab `/approval` web
  mobile — saat ini difilter berdasarkan Role pemilik absensi; tambahkan
  cakupan Divisi di atasnya (pemetaan Role pemilik → tahap tetap sama).
- Aksi review absensi menolak reviewer di luar cakupan.
- Badge notifikasi ikut cakupan yang sama.

## Kriteria selesai

- [ ] Setelah Jabatan diisi (tiket 14), antrean 474 absen luar radius lama
      terbagi sendiri ke Supervisor Divisi tanpa migrasi data.
- [ ] Supervisor tidak bisa memutuskan absensi Divisi lain lewat API.
- [ ] Mobile 1.1.0 tidak perlu diubah.
- [ ] lint + `tsc --noEmit` + `npm test` hijau.
