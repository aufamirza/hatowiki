# Review terjemahan: hewan event

3 hewan di section event halaman daftar https://www.heartodex.com/en/wild-animals (diperiksa 2026-09-28): Call of Whales 1, Maltese 1, Winter frost season 1.
Kolom **Asli** disalin apa adanya dari halaman detail (`descriptionOriginal`), termasuk salah ketiknya. Kolom **Terjemahan**
mengikuti maksud asli; nama, nama lokasi, dan istilah game tetap bahasa Inggris.

- Kata mencurigakan (pola "y" → "g") ditandai otomatis oleh `scripts/heartodex-sync.mjs`, lalu dicek manual di kolom Catatan
  (termasuk salah ketik yang lolos dari skrip).
- Status event di sumber ("Active Event", "Unavailable — Event ended") tidak disimpan dan tidak ditampilkan.
- Halaman detail event juga punya deret "Event Tokens" per bintang; tidak diminta untuk wildlife, jadi tidak disimpan.
- Dolphin memakai peta bawah laut Whalefall Canyon (sudah diunduh di ronde sebelumnya). Penguin tidak punya titik
  tempat makan di sumber → `feedingSpot: null` + TODO, peta memakai zona Old Sea.

| Section | Hewan | Asli (EN) | Terjemahan (ID) | Data — Catatan |
| --- | --- | --- | --- | --- |
| Call of Whales | Dolphin (`dolphin`) | Did the dolphins riding the current to Whalefall Canyon just happen to pass by because of nutrients stirring in the clean waters, or were they following some deep, mysterious call from the ocean? | Apakah lumba-lumba yang menunggangi arus ke Whalefall Canyon itu kebetulan lewat karena nutrisi yang teraduk di perairan jernih, atau mereka sedang mengikuti panggilan samudra yang dalam dan misterius? | lokasi: Whalefall; makanan: Sea Bass, Sardine, Scad — peta Whalefall Canyon (peta bawah laut); titik tempat makan dari pin/flymark |
| Maltese | Maltese (`maltese`) | A Maltese's world is simple—as long as you play with me, we're best friends! | Dunia seekor Maltese itu sederhana—asal kamu mau bermain denganku, kita sahabat! | lokasi: Forest Island; makanan: Meat, Grilled Mushrooms — makanan: Meat (Ingredient, tanpa tautan) & Grilled Mushrooms (resep, tertaut) |
| Winter frost season | Penguin (`penguin`) | Amid the frigid polar climate lives a colony of penguins who rarely venture far from home... but exceptions do happen. | Di tengah iklim kutub yang membekukan, hiduplah sekelompok penguin yang jarang pergi jauh dari rumah... tapi pengecualian tetap ada. | lokasi: Old Sea; makanan: False Scad, Common Prawn, Sardine — TODO: titik tempat makan tidak ada di sumber (peta memakai zona lokasi) |
