# Review terjemahan: tanaman (Crops)

19 tanaman dari https://www.heartodex.com/en/crops (diperiksa 2026-09-28): 14 di section Base Game (🏠 Common, level
1–13) dan 5 di section event. Kolom **Asli** disalin dari bagian About di halaman detail (`descriptionOriginal`), termasuk
salah ketiknya. Kolom **Terjemahan** mengikuti maksud asli; nama tanaman, nama benda, dan istilah game tetap bahasa Inggris.

- Level diambil dari halaman daftar (halaman detail tanaman tidak mencantumkan level). Harga benih (Buy Price) dan waktu
  tumbuh (Growth Time, disimpan dalam detik) dari halaman detail. Farming Mastery tidak disimpan.
- Semua deret angka per bintang disimpan beserta label aslinya di `starValues`: tanaman Base Game hanya punya Market
  Value; tanaman event juga punya Event Tokens. Artinya tidak ditafsirkan; hanya Market Value yang ditampilkan sebagai
  "Harga jual". Tidak ada angka desimal di sumber.
- Heartodex menandai Common tanaman dengan 🏠 (sama dengan kategori lain). Sesuai permintaan, halaman detail tanaman
  Hatowiki menampilkan Common dengan 🏷️; kartu daftar dan filter tetap 🏠 dan tetap satu kategori Common.
- Tidak ada teks berbahasa Spanyol di deskripsi tanaman.
- Gambar 15 tanaman yang sudah dipakai sebagai bahan dipindah dari `public/images/items/` ke `public/images/crops/`
  (tidak diunduh ulang); 4 gambar baru diunduh (Prickly Pear, Starfruit, Romaine Lettuce, Lemon Verbena).

| Section | Lv | Tanaman | Asli (EN) | Terjemahan (ID) | Nilai per bintang — Catatan |
| --- | --- | --- | --- | --- | --- |
| Base Game | 1 | Paddy (`paddy`) | — | — | Market Value: 37/49/61/74/111 — blok About kosong di sumber: deskripsi `null` + TODO (tampil "Deskripsi belum tersedia.") |
| Base Game | 1 | Potatoes (`potatoes`) | Guess what happens when a potato sits on a couch? It becomes a couch potato! | Coba tebak, apa jadinya kalau kentang duduk di sofa? Ia jadi couch potato, si pemalas sofa! | Market Value: 90/120/150/180/210 — permainan kata "couch potato" dipertahankan dengan penjelasan singkat |
| Base Game | 1 | Tomato (`tomato`) | It's small, round, and bursting with sunlight, like nature's little red gem. | Kecil, bulat, dan penuh sinar matahari, bagaikan permata merah mungil dari alam. | Market Value: 30/40/50/60/70 |
| Base Game | 2 | Wheat (`wheat`) | It's more than just food, also good for your health and full of wholesome benefits. | Bukan sekadar bahan makanan, gandum juga baik untuk kesehatan dan penuh manfaat bergizi. | Market Value: 285/381/475/570/855 |
| Base Game | 3 | Lettuce (`lettuce`) | No salad is complete without it! | Tanpa selada, salad apa pun tak akan lengkap! | Market Value: 435/582/726/870/1305 |
| Base Game | 4 | Pineapple (`pineapple`) | Enjoy it fresh or in desserts... but no pineapple pizza! | Nikmati langsung atau dalam hidangan penutup... tapi jangan jadi pizza nanas! | Market Value: 52/69/86/104/118 — "no pineapple pizza" = jangan dijadikan topping pizza |
| Base Game | 5 | Carrot (`carrot`) | It may have been a childhood nightmare for some, but it's surprisingly nutritious! | Bagi sebagian orang, wortel mungkin mimpi buruk masa kecil, tapi ternyata sangat bergizi! | Market Value: 155/207/258/310/350 |
| Base Game | 6 | Strawberry (`strawberry`) | With the sweet freshness of early spring, it's crowned as the "Queen of Fruits." | Dengan kesegaran manis awal musim semi, stroberi dinobatkan sebagai "Ratu Buah". | Market Value: 375/502/626/750/1125 |
| Base Game | 6 | Corn (`corn`) | Easy to grow, with abundant yields. A crop that doesn’t cause any headaches. | Mudah ditanam dan hasil panennya melimpah. Tanaman yang sama sekali tidak bikin pusing. | Market Value: 510/690/860/1020/1545 |
| Base Game | 7 | Grape (`grape`) | It has clusters of sweet little orbs, each bursting with sunshine in every bite. | Tandannya berisi butiran kecil yang manis, masing-masing penuh sinar matahari di setiap gigitan. | Market Value: 480/643/801/960/1440 |
| Base Game | 8 | Eggplant (`eggplant`) | It's humble on the outside, but a master of soaking up flavor. | Tampilannya sederhana, tapi jagonya menyerap rasa. | Market Value: 406/544/678/812/1218 |
| Base Game | 11 | Tea Leaf (`tea-leaf`) | From a faraway Eastern land, it serves as the base for many delicious brews. | Berasal dari negeri Timur yang jauh, daun teh menjadi dasar banyak minuman seduh yang lezat. | Market Value: 75/100/125/150/225 |
| Base Game | 12 | Cacao Bean (`cacao-bean`) | With its unique rich aroma, it's nature's gift to every sweet tooth. | Dengan aromanya yang khas dan kaya, biji kakao adalah hadiah alam bagi setiap pencinta makanan manis. | Market Value: 330/442/551/660/990 |
| Base Game | 13 | Avocado (`avocado`) | — | — | Market Value: 540/810/1080/2160/4320 — blok About kosong di sumber: deskripsi `null` + TODO |
| Echo of Ancients | 1 | Prickly Pear (`prickly-pear`) | It can survive the desert and take over your plate. Just watch out for the spikes. | Sanggup bertahan di gurun sekaligus menguasai piringmu. Hati-hati saja dengan durinya. | Market Value: 30/40/50/60/90; Event Tokens: 10/13/16/20/30 — dua deret per bintang: Market Value & Event Tokens (label asli, artinya tidak ditafsirkan); label "Active Event" di halaman daftar tidak disimpan |
| Call of Whales | 1 | Starfruit (`starfruit`) | An ordinary starfruit, when sliced at just the right angle, turns into a sparkling star. | Belimbing biasa, kalau diiris dengan sudut yang pas, berubah menjadi bintang yang berkilau. | Market Value: 30/40/50/60/—; Event Tokens: 20/26/33/—/— — Market Value hanya 1★–4★ dan Event Tokens 1★–3★ di sumber: kualitas lain `null` + TODO (tampil "—"); status "Unavailable — Event ended" tidak disimpan |
| Modular Streets | 1 | Lemon Verbena (`lemon-verbena`) | No lemons in sight, yet it bursts with a strong lemon fragrance—even fresher and longer-lasting. | Tak ada lemon sama sekali, tapi aroma lemonnya kuat, bahkan lebih segar dan lebih tahan lama. | Market Value: 30/40/50/60/70; Event Tokens: 10/13/16/20/30 — deret Event Tokens; status event tidak disimpan |
| Dreamlight Cinematics | 1 | Romaine Lettuce (`romaine-lettuce`) | It sounds like a standout in the celtuce family. | Namanya terdengar seperti primadona di keluarga celtuce. | Market Value: 30/40/50/60/70; Event Tokens: 10/13/16/20/30 — "celtuce" tetap bahasa Inggris (istilah game, dipakai di nama resep seperti "Celtuce Taco"); deret Event Tokens; status event tidak disimpan |
| Winter frost season | 1 | White Radish (`white-radish`) | A nutrient-rich "commoner's ginseng." | "Ginseng rakyat biasa" yang kaya gizi. | Market Value: 30/40/50/60/70; Event Tokens: 10/13/16/20/30 — deret Event Tokens; status event tidak disimpan |
