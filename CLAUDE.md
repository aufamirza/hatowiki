# Hatowiki

## Standar selesai

- Setiap perubahan cukup diverifikasi dengan `npm run build`.
- Jangan menjalankan `npm run test:ui` lengkap, kecuali:
  - diminta secara eksplisit, atau
  - perubahannya menyentuh komponen yang dipakai bersama oleh banyak kategori.
- Untuk perubahan lain, kalau perlu tes, jalankan hanya untuk kategori yang terdampak dan di satu lebar layar saja, misalnya `node scripts/qa/wildlife-list.test.mjs bugs 1280`.
- Tetap tambahkan atau perbarui tes untuk fitur baru, tapi menjalankan tes lengkap tidak wajib.
- Jangan mengambil ulang screenshot kecuali diminta.
- Tutup dengan ringkasan singkat berbahasa Indonesia di chat.

## Teks dan terjemahan

- Jangan memakai tanda pisah panjang (em dash, "—") di teks yang tampil di situs, dalam bahasa apa pun: terjemahan deskripsi (Indonesia, Thai), teks antarmuka, dan meta description. Pakai tanda baca yang paling natural untuk kalimatnya (koma, titik, titik dua, atau tanda kurung) tanpa mengubah maknanya.
- Tanda pisah pendek untuk rentang angka (misalnya 75–600) boleh.
- `descriptionOriginal` tidak diubah. Teks deskripsi bahasa Inggris mengikuti tanda baca sumber; yang dibetulkan hanya salah ketik yang tercatat di `scripts/translations/english-corrections.json`.
