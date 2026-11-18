Status: ready-for-agent
Repo: attendance-tam
Blocked by: 01

# 04 — Absen Pulang Terlewat: jam otomatis ikut Jam Pulang + validasi (backend + web)

Spec: `../spec.md` (§3 Absen Pulang Terlewat). User story 52–57.

## Yang dibangun

- **Jam pulang otomatis** = Jam Pulang Hari Kerja untuk tanggal yang
  dikonfirmasi (Sabtu 14:00, hari biasa 17:00), menggantikan konstanta 17:00
  di server. Aturan bebas-Prisma di modul jadwal kerja.
- **Validasi**: jam pulang yang dipilih harus **> jam absen masuk** tanggal
  itu. Dicek di aksi konfirmasi (penentu). Pesan error menyebut jam masuk
  ("Jam pulang harus setelah jam masuk 08:02").
- **Data untuk dialog**: daftar hari terlewat disertai, per hari, label hari +
  tanggal, jam masuk, dan jam pulang otomatis — semua sudah diformat di server.
  Di `GET /api/attendance/missed` ini **ditambahkan** sebagai field baru;
  field `days` yang lama tetap ada dan tetap sama (mobile 1.1.0 memakainya).
- **Dialog web** (Absen Pulang Terlewat): judul menyebut hari
  ("Absen pulang hari Sabtu, 14 Nov"), menampilkan jam masuk, tombol
  "Otomatis pukul 14:00" dengan jam sebenarnya, validasi yang sama di client.
- **Dialog absen manual admin**: jam bawaan absen pulang = Jam Pulang Hari
  Kerja tanggal yang dipilih, bukan 17:00.

## Kriteria selesai

- [x] Test (Vitest): jam otomatis Sabtu → 14:00, Senin → 17:00, fallback saat
      `WorkDay` kosong; pulang 05:00 dengan masuk 08:00 ditolak, sama dengan
      jam masuk ditolak, 14:00 diterima.
- [x] Tidak ada lagi konstanta 17:00 untuk jam pulang otomatis di server dan
      dialog web.
- [x] Respons `GET /api/attendance/missed` tetap berisi `days` (kompatibel).
- [x] Mengirim jam pulang tidak sah lewat API (seperti mobile lama) ditolak
      server dengan pesan yang jelas.
- [ ] Tree mobile web: dialog dicek lewat loop parity; desktop tidak berubah
      selain isi dialog.
- [x] lint + `tsc --noEmit` + `npm test` hijau.

## Comments

**2026-11-18** — Diimplementasikan di commit `5fdd62b` (`autoCheckOutTimeFor()`,
`missedCheckoutTimeError()`, `lib/missed-checkout.ts`, field `missedDays` di
`GET /api/attendance/missed`, `MissedCheckoutDialog`, default jam pulang di
`ManualAttendanceDialog`). Diverifikasi ulang: `tsc --noEmit` bersih, `npm test`
45/45, `npm run lint` 0 error.

Belum: loop parity tree mobile web. `MOBILE_PARITY.md` mencatat modal ini belum
di-port ke tree mobile, dan verifikasinya butuh baris absen masuk tanpa absen
pulang di DB dev untuk akun parity. Status dibiarkan sampai itu dicek.
