Status: ready-for-agent
Repo: mobile-tam
Blocked by: 07

# 08 — Mobile: dialog Hubungi Admin, tutup layar request account

Spec: `../spec.md` (§1). User story 4–5, 7, 9, 65.

## Yang dibangun

- Tautan ke layar request account di layar **login** dan **welcome** diganti
  tombol yang membuka dialog Hubungi Admin (pola modal yang sudah dipakai
  aplikasi), berisi:
  - email `admin@tarunagroup.co.id` sebagai teks yang bisa dipilih/disalin
    dengan tekan lama;
  - tombol "Kirim email" → `Linking.openURL("mailto:…")` dengan subjek +
    template yang sama seperti web (tiket 07).
  - **Tanpa** tombol salin (tidak ada modul clipboard; menambah modul native
    berarti APK baru).
- Layar request account lama → redirect ke login (rute tetap ada supaya deep
  link lama tidak 404).
- Kalau `Linking.openURL` gagal (tidak ada aplikasi email), tampilkan pesan
  yang menyuruh menyalin email secara manual.

## Kriteria selesai

- [ ] Tidak ada lagi jalan di UI ke form request account.
- [ ] Teks dan template email identik dengan web.
- [ ] Hanya perubahan JavaScript (OTA ke runtime 1.1.0).
- [ ] lint + typecheck mobile hijau; dicek di simulator.
