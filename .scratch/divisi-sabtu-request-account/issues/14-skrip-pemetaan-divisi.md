Status: ready-for-agent
Repo: attendance-tam
Blocked by: 09

# 14 — Skrip sekali jalan: pemetaan Divisi & Jabatan awal

Spec: `../spec.md` (Skrip sekali jalan → Pemetaan Divisi). User story 61–63.

## Yang dibangun

Skrip TypeScript (`tsx`, Prisma client yang sama) yang membuat struktur awal
dan memetakan user, memakai jalur set-Jabatan tiket 09 (supaya kolom teks
jabatan ikut tersinkron).

**Struktur:**
- Divisi **Admin**: Jabatan *Supervisor Admin*, *Admin*.
- Divisi **Teknis**: Jabatan *Supervisor Teknis*, *Teknisi*, *Teknisi (EoS)*,
  *Programmer*.

**Pemetaan** (cocokkan **id + email** sekaligus, dari snapshot produksi):
- Sally Riski → Supervisor Admin (harus Role SUPERVISOR)
- Delima Ayu Anugrah, Nadhirah Meidiasty Maharani, Aulia Zatalini → Admin
- Sopiah Bimabia → Admin (Role ADMIN — memang begitu)
- Dwiky Wahyudi → Supervisor Teknis (harus Role SUPERVISOR)
- Semua user **aktif** dengan teks jabatan persis "Teknisi" → Teknisi
- Hery Arffan → Teknisi (EoS)
- Daffa Althaf Ridovani (`daffalthaf25@…`) → Programmer
- **Tidak dipetakan:** Administrator (2 akun), Karyawan Contoh (2 akun),
  `tes-dika-1`, Reza Maulana (Manager), akun nonaktif.

Daftar id/email **tidak** di-commit ke repo (data pribadi karyawan). Skrip
membaca file pemetaan lokal (CSV/JSON: `userId, email, jabatan`) yang
path-nya diberikan sebagai argumen; sertakan contoh format dengan data
rekaan, dan tambahkan pola nama file pemetaan asli ke `.gitignore`. Isi file
asli disusun dari snapshot `User` produksi sesuai daftar di atas.

**Pengaman:** bawaan dry-run (cetak tabel user → Jabatan → Divisi); tulis
hanya dengan `--apply`; satu transaksi; cek `_prisma_migrations` memuat
migrasi tiket 09; idempoten (Divisi/Jabatan dibuat kalau belum ada; user yang
sudah punya Jabatan yang sama dilewati, yang punya Jabatan **berbeda** →
berhenti); berhenti total kalau id/email tidak cocok atau Role tidak sesuai
dugaan.

## Kriteria selesai

- [ ] Dry-run ke salinan DB lokal melaporkan pemetaan persis seperti di atas.
- [ ] `--apply` dua kali: kali kedua tidak mengubah apa pun.
- [ ] Setelah apply, `/admin/divisi` menampilkan pohon yang benar; tidak ada
      Divisi tanpa Supervisor; "Belum punya Jabatan" berisi akun yang memang
      tidak dipetakan.

## Catatan

- Agent tidak menjalankan `--apply` ke produksi.
- Output dry-run cukup menampilkan nama + Jabatan; email hanya dipakai untuk
  pencocokan, tidak perlu dicetak.
