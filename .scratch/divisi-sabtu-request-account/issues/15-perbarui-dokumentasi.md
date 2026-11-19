Status: ready-for-agent
Repo: attendance-tam (+ catatan singkat di mobile-tam bila ada CLAUDE.md/README yang menyebut aturan 18:00 / 17:00 / request account)
Blocked by: 02, 04, 07, 09, 11

# 15 — Perbarui CLAUDE.md, README, dan MOBILE_PARITY.md

Spec: `../spec.md` (Further Notes).

## Yang dibangun

CLAUDE.md:
- **Perbaiki yang sudah usang:** Dinas luar disetujui **Manager** (sejak
  15 Sep 2026), bukan admin; grup rute `(employee)` memakai `requireUser()`,
  bukan khusus EMPLOYEE.
- **Tambah:** bagian Divisi/Jabatan/Supervisor Divisi + routing saat review
  (rujuk `GLOSSARY.md`, ADR 0001, ADR 0002, modul aturan routing); Jam Mulai
  Lembur per Hari Kerja dan jam pulang otomatis yang ikut Jam Pulang (ganti
  semua penyebutan "18:00"/"Otomatis pukul 17:00" yang tetap); request
  account publik ditutup (410), dialog Hubungi Admin; `npm test` (Vitest) di
  daftar Commands.
- Daftar route admin ditambah `/admin/divisi`.

README.md: fitur request account dihapus dari daftar; tambah Divisi; tambah
script `npm test`.

MOBILE_PARITY.md: baris checklist #4 (Request account) diberi catatan bahwa
fitur ditutup dan diganti dialog Hubungi Admin.

## Kriteria selesai

- [ ] Tidak ada lagi klaim di dokumen yang bertentangan dengan kode (cek
      grep "18:00", "17:00", "request-account", "disetujui admin").
- [ ] Istilah mengikuti `GLOSSARY.md`.
