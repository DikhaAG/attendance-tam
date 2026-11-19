Status: ready-for-agent
Repo: attendance-tam
Blocked by: 04

# 06 — Skrip sekali jalan: koreksi 47 absen pulang Sabtu 17:00 → 14:00

Spec: `../spec.md` (Skrip sekali jalan → Koreksi Sabtu). User story 58–59.

## Yang dibangun

Skrip TypeScript (dijalankan dengan `tsx`, memakai Prisma client yang sama)
yang mengoreksi absen pulang Sabtu hasil tombol "Otomatis 17:00" lama.

**Baris sasaran** — semua syarat harus terpenuhi: `CHECK_OUT`, `isManual`,
`createdByAdminId` null, `editedAt` null, tanggal kerja hari Sabtu, jam
tepat 17:00 WIB.

**Per baris:** `originalTimestamp` = jam lama; `timestamp` = Jam Pulang
Sabtu dari `WorkDay` (14:00 WIB); `editedById` = akun Administrator aktif
(dicari lewat email `admin@tarunagroup.co.id`, berhenti kalau tidak ada /
bukan ADMIN); `editedAt` = sekarang; `editNote` = "Koreksi sistem: jam pulang
otomatis Sabtu seharusnya 14:00".

**Pengaman:** bawaan dry-run (cetak tabel baris: id, userId, tanggal, jam lama
→ jam baru); tulis hanya dengan `--apply`; satu transaksi; idempoten (baris
yang sudah `editedAt` dilewati); cetak jumlah sebelum/sesudah; berhenti total
kalau Jam Pulang Sabtu di `WorkDay` bukan hari kerja.

## Kriteria selesai

- [ ] Dry-run ke salinan DB lokal (restore backup produksi) melaporkan
      **47 baris**; dua anomali (pulang 05:00 & 07:01) dan 12 baris 14:00
      **tidak** tersentuh.
- [ ] Menjalankan `--apply` dua kali: kali kedua 0 baris.
- [ ] Setelah apply, baris tampil berlabel "Diubah admin" di halaman
      kehadiran admin dengan jam asli terlihat.
- [ ] Ada petunjuk singkat di header skrip: backup dulu, dry-run dulu.

## Catatan

- Agent **tidak** menjalankan `--apply` ke produksi — itu langkah manusia.
- Jalankan setelah tiket 04 dirilis, supaya tidak muncul baris salah baru.
