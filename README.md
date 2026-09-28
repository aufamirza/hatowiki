# Hatowiki

Wiki komunitas Heartopia berbahasa Indonesia (proyek fan, tidak resmi).

Tahap sekarang: kategori **Wildlife**, dengan **Fish** berisi 124 ikan (97 Base Game + 27 event), **Bugs** berisi 101 serangga (76 + 25), **Birds** berisi 103 burung (77 + 26), dan **Animals** berisi 11 hewan (8 + 3), serta **Recipes** berisi 208 resep (87 Base Game + 121 dari 13 event). Kategori Wiki **Crops** berisi 19 tanaman (14 Base Game + 5 event) dan **Collectibles** berisi 40 bahan alam (33 Base Game + 7 event). Semua entri di halaman daftar Heartodex sudah dimasukkan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

Uji interaksi halaman `/wildlife/fish`, `/wildlife/bugs`, `/wildlife/birds`, `/wildlife/animals`, `/recipes`, `/crops`, dan `/collectibles` (pencarian, filter, klik opsi filter, keyboard, navigasi, warna badge level di light & dark; untuk Bugs, Birds & Animals: filter lokasi jamak, "lokasi pertama +N", detail dengan beberapa lokasi; Animals: tanpa level/jadwal/harga, pin tempat makan, makanan favorit; Recipes: pencarian nama bahan, energi, harga jual, bahan tetap & pilihan, tautan bahan ke resep lain, ke detail ikan & "Any Fish" ke daftar Fish, satu jenis masakan berdampingan di tiap urutan, urutan manual Roll Cake; semua kategori: kotak gambar kartu persegi & seragam, warna badge kategori dari token & kontras AA; Bugs & Birds: badge level di gambar dan kotak detail dua bagian; semua kategori: section Base Game paling atas lalu event terbaru → terlama, judul section, status event tidak tampil; Crops & Collectibles: detail, "Dipakai di resep" & "Makanan favorit hewan" dari data, tautan Apple & Tomato; entri event Fish, Bugs, Birds, Animals & Recipes: isi tiap section, filter/pencarian/urutan per section, detail event (badge kategori, harga yang tidak ada di sumber "—", lokasi event dengan zona atau placeholder), kelompok resep event, tautan bahan event termasuk Frostspore King Crab) di Chrome headless, untuk lebar 1280, 820, dan 390 px:

Uji beranda dan toolbar global (`scripts/qa/home.test.mjs`, ikut dijalankan `npm run test:ui`): toolbar sticky, menu
Wildlife & Wiki (klik & keyboard), drawer menu seluler (fokus terkunci, Escape, klik latar), pencarian global (hasil dari
semua kategori dicocokkan dengan data, panah/Enter/Escape, klik mouse), hero (hiasan tidak menutupi teks, jeda di
luar layar, prefers-reduced-motion), Waktu Server 5 kotak, Muncul Sekarang (server bawaan SEA, ganti server, isi dari
jadwal di data, hanya entri Base Game, "Lihat semua" berfilter waktu), kartu kategori, kontras AA light & dark, dan
halaman tidak melebar.

```bash
npm run dev        # di terminal lain
npm run test:ui    # butuh Chrome atau Edge; lokasi lain bisa diset lewat CHROME_PATH
node scripts/qa/wildlife-list.test.mjs bugs 390   # satu kategori / satu lebar (fish, bugs, birds, animals, recipes, crops, collectibles)
node scripts/qa/home.test.mjs 390                 # beranda & toolbar, satu lebar
```

Semua halaman memakai toolbar global yang menempel di atas: logo, menu Wildlife (dropdown Fish, Bugs, Birds,
Animals), menu Wiki (dropdown Resep, Crops, Collectibles), pencarian nama di semua kategori, dan tombol tema. Di bawah 760 px menu pindah ke drawer dan
pencarian ke balik tombol ikon.

Situs memakai client-side routing (`react-router-dom`). Saat di-deploy, server harus mengarahkan semua path ke `index.html` (SPA fallback), supaya URL seperti `/wildlife/fish/sea-bass` bisa dibuka langsung.

## Halaman

| Route | Isi |
| --- | --- |
| `/` | Beranda: hero (pemandangan SVG/CSS + hiasan dari gambar data), Waktu Server 5 kotak, kartu kategori (jumlah dari data), Muncul Sekarang (per server, berdasarkan jadwal) |
| `/wildlife` | Hub 4 kategori: Fish, Bugs, Birds, Animals |
| `/wildlife/fish`, `/wildlife/bugs`, `/wildlife/birds` | Grid kartu (badge kategori & level), pencarian, filter, urutan |
| `/wildlife/fish/:slug`, `/wildlife/bugs/:slug`, `/wildlife/birds/:slug` | Detail (5 kotak). Ikan: gambar \| level & shadow \| harga jual; serangga & burung (tanpa shadow): gambar dengan badge level \| harga jual |
| `/wildlife/animals` | Grid kartu (badge kategori), pencarian, filter Lokasi/Cuaca favorit/Kategori, urutan default & A–Z |
| `/wildlife/animals/:slug` | Detail (4 kotak: identitas & gambar, lokasi + peta dengan pin tempat makan, cuaca favorit, makanan favorit) |
| `/recipes` | Grid kartu (badge kategori & level, rentang energi & harga jual), pencarian nama resep & bahan, filter Level/Kategori, urutan (satu jenis masakan selalu berdampingan) |
| `/recipes/:slug` | Detail (4 kotak: gambar + badge level + harga jual, identitas, energi, bahan) |
| `/crops` | Grid kartu (badge kategori & level, waktu tumbuh, harga benih), pencarian, filter Level/Kategori, urutan |
| `/crops/:slug` | Detail: identitas (Common ditandai 🏷️), gambar + badge level + semua deret nilai per bintang (Harga jual, Event Tokens, …), info tanam (harga benih & waktu tumbuh), Dipakai di resep, Makanan favorit hewan |
| `/collectibles` | Grid kartu (badge kategori, lokasi, nilai jual), pencarian, filter Lokasi/Kategori, urutan default & A–Z |
| `/collectibles/:slug` | Detail: identitas, gambar + nilai jual + energi (kalau ada), lokasi + peta zona, Dipakai di resep, Makanan favorit hewan |

Semua halaman daftar dibagi per section: 🎮 Base Game paling atas, lalu satu section per event dari yang paling baru
dimulai sampai yang paling lama (tanggal mulai di `src/data/events.js`, bersumber dari halaman event Heartodex; tidak
ditampilkan). Section ditentukan field `section` di data, yaitu posisi entri di halaman daftar Heartodex, bukan
kategorinya (mis. Striped Red Mullet berkategori Sea Fishing dan Starfall Shard berkategori Meteor Shower tetap di Base
Game). Pencarian, filter, dan urutan berlaku di dalam tiap section; section tanpa hasil disembunyikan. Status event
(aktif/selesai) tidak disimpan maupun ditampilkan. Muncul Sekarang di beranda hanya memakai entri Base Game.

## Struktur

```
public/images/fish/           Gambar ikan (diunduh dari Heartodex)
public/images/bugs/           Gambar serangga (diunduh dari Heartodex)
public/images/birds/          Gambar burung (diunduh dari Heartodex)
public/images/animals/        Gambar hewan (diunduh dari Heartodex)
public/images/recipes/        Gambar resep (diunduh dari Heartodex)
public/images/crops/          Gambar tanaman (diunduh dari Heartodex; juga dipakai sebagai gambar bahan)
public/images/collectibles/   Gambar collectible (diunduh dari Heartodex; juga dipakai sebagai gambar bahan)
public/images/items/          Gambar benda lain: ingredient, resep, ikan (diunduh dari Heartodex)
public/images/maps/           Peta dasar Heartopia dan peta bawah laut Whalefall Canyon (diunduh dari Heartodex)
src/
├── App.jsx                   Definisi route
├── styles/tokens.css         Design token: warna (light & dark, termasuk --level-1…14 badge level), font, radius, spacing, bayangan
├── styles/base.css           Reset, tipografi, utilitas (.container, .btn, dll)
├── data/
│   ├── gameTime.js           Server + offset UTC, periode Dawn/Day/Dusk/Night
│   ├── events.js             Event (nama, emoji, tanggal mulai + sumbernya) untuk urutan section; Base Game
│   ├── items.js              Benda bersama (bahan resep, makanan hewan): id, nama, jenis, gambar, sumber (+ validator);
│   │                         Crop & Collectible diturunkan dari datanya sendiri
│   ├── itemUsage.js          Resep yang memakai sebuah benda & hewan yang menyukainya (dihitung dari data)
│   ├── crops/                crops.js (data + skema), categories.js, validateCrops.js
│   ├── collectibles/         collectibles.js (data + skema), categories.js, validateCollectibles.js
│   ├── recipes/
│   │   ├── recipes.js        Data resep (+ skema: energi, harga jual, kelompok bahan fixed/choose)
│   │   ├── categories.js     Kategori resep (Common + event) beserta emojinya
│   │   ├── families.js       Aturan kelompok jenis masakan (field family) & keputusan kasus meragukan
│   │   └── validateRecipes.js  Validator skema resep
│   └── wildlife/
│       ├── fish.js           Data ikan (+ skema)
│       ├── bugs.js           Data serangga (+ skema; lokasi berupa array, tanpa shadow)
│       ├── birds.js          Data burung (+ skema; seperti serangga, angka per kualitas = harga jual Info Card)
│       ├── animals.js        Data hewan (+ skema; tanpa level/jadwal/harga, titik tempat makan, makanan favorit)
│       ├── categories.js     Kategori hub Wildlife + skema per kategori (shadow, lokasi jamak, harga bulat, level, jadwal, …)
│       ├── validateWildlife.js  Validator skema (dipakai app saat dev dan skrip sinkronisasi)
│       ├── attributes.js     Nilai valid: shadow, weather, kategori ikan, serangga, burung & hewan
│       ├── entryLocations.js Lokasi entri sebagai [{ name, zone }] untuk skema mana pun
│       ├── locationZones.js  Poligon zona lokasi di peta
│       └── zoneViewBox.js    Potongan peta untuk beberapa zona sekaligus
├── components/
│   ├── catalog/              CatalogCard (kartu generik: gambar, badge kategori & level, baris info)
│   ├── wildlife/             EntryCard, EntryImage, LocationMap (zona atau pin), MarketValue, dll (dipakai semua kategori)
│   ├── recipes/              RecipeCard, ringkasan nilai per bintang
│   ├── items/                ItemList (gambar, nama, jenis, jumlah; tautan kalau benda punya halaman), LinkTileList
│   ├── goods/                CropCard & CollectibleCard
│   ├── layout/               Layout (toolbar & footer), NavMenu (dropdown Wildlife & Wiki), MobileMenu (drawer), ThemeToggle, catalogs.js (daftar katalog bersama)
│   ├── search/               GlobalSearch (combobox di toolbar), searchIndex.js (nama semua entri)
│   └── …                     ServerTime (versi daftar & kotak), Breadcrumbs, CategoryHeader, PanelTitle
└── pages/
    ├── HomePage, NotFoundPage
    ├── home/                 HomeHero (pemandangan & hiasan), NowAppearing (Muncul Sekarang), CategorySection
    ├── catalog/              CatalogListPage (daftar generik: pencarian, filter, urutan, section, status di URL), listState.js, sections.js, filterDefs.js
    ├── wildlife/             WildlifeListPage & WildlifeDetailPage, AnimalDetailPanels, wildlifeKinds.js (konfigurasi per kategori)
    ├── recipes/              RecipeListPage, RecipeDetailPage, recipeKind.js, recipeOrder.js (Urutan Default per jenis masakan)
    └── goods/                GoodsListPage, CropDetailPage, CollectibleDetailPage, UsagePanels, goodsKinds.js (Crops & Collectibles)
```

`components/layout/catalogs.js` mengumpulkan semua katalog (Fish, Bugs, Birds, Animals, Recipes, Crops, Collectibles) beserta ikon, teks,
data, dan tautannya; toolbar, drawer, pencarian global, dan kartu kategori di beranda memakainya, jadi kategori baru
cukup ditambahkan di sana. Jumlah entri di mana pun selalu dihitung dari data.

Halaman daftar dipakai bersama oleh semua katalog (`CatalogListPage`): wildlife lewat `WildlifeListPage`, resep lewat
`RecipeListPage`. Halaman detail wildlife dipakai bersama oleh semua kategori wildlife. Perbedaannya diatur lewat
konfigurasi: skema data di `WILDLIFE_CATEGORIES` (`categories.js`: `hasLevel`, `hasSchedule`, `hasMarketValue`,
`hasFavoriteFood`, `weatherLabel`, …) dan teks/tampilan di `WILDLIFE_KINDS` (`wildlifeKinds.js`) atau `RECIPE_KIND`
(`recipeKind.js`). Hewan tidak punya level, jadwal, dan harga, jadi detailnya memakai empat kotak (`AnimalDetailPanels`).

Bahan resep dan makanan favorit hewan dirujuk lewat id (`crops/tomato`, `recipes/tiramisu`, …). Benda berjenis Crop
dan Collectible hanya punya satu sumber data, yaitu `crops.js` dan `collectibles.js` (gambar di
`public/images/crops|collectibles/`); benda lain disimpan di `src/data/items.js`. Benda yang punya halaman di Hatowiki
ditautkan: resep, tanaman, dan collectible ke `/recipes|crops|collectibles/<slug>`, ikan (juga serangga & burung kalau
nanti ada) ke `/wildlife/<kategori>/<slug>`, dan bahan generik "Any Fish" ke daftar `/wildlife/fish`. Tautan hanya
dibuat kalau entrinya ada di data, jadi entri yang ditambahkan belakangan otomatis tertaut (mis. ikan event Frostspore
King Crab di Seafood Risotto). Benda baru yang juga entri Hatowiki (ikan, resep) memakai gambar entri itu, jadi
gambarnya tidak diunduh dua kali. Ingredient belum punya halaman, jadi tampil tanpa tautan. Kotak "Dipakai di resep" dan "Makanan favorit
hewan" di detail tanaman & collectible dihitung dari data resep dan hewan Hatowiki (`itemUsage.js`).

Resep satu jenis masakan (mis. semua Pie, Jam, Roll Cake, Milkshake) dikelompokkan lewat field `family` di
`recipes.js` (hanya berlaku di dalam satu section: resep Base Game dan event tidak dicampur), dengan `familyBase: true` untuk versi dasarnya (mis. Mushroom Pie, Mixed Jam) dan `familyOrder` (1, 2, …)
untuk urutan manual di dalam kelompok (mis. Roll Cake mengikuti warna pelangi). Ini pengelompokan tampilan, bukan
data game, dan boleh diubah manual; aturan akhiran nama dan keputusan kasus meragukan ada di `families.js`. Urutan
Default di `/recipes`: kelompok urut level terendah anggotanya, versi dasar paling depan, lalu urutan manual, lalu
level dan abjad. Urutan level tetap menurut level, tapi resep berlevel sama tetap berkelompok; A–Z murni abjad. Semua
urutan berlaku di dalam tiap section. Resep event juga dikelompokkan (Mooncake, Verbena Pie, Shaved Ice, Frosted Pancake,
Springday Black Tea, Celtuce Taco, Zongzi, Pearl Cake, Grilled Squid w/ Jam, Patty Burger, Canelé, Con Panna, Crepe,
Popcorn Bucket, …); keputusannya di `families.js`.

Gambar entri selalu ditaruh di kotak persegi dengan `object-fit: contain` (kartu daftar, Muncul Sekarang, contoh di
kartu kategori, hiasan hero, thumbnail pencarian, tile bahan), jadi gambar yang tinggi (mis. Bagworm Moth 400×1166,
Black Stork 400×846) atau lebar tetap utuh tanpa mengubah ukuran kotaknya. Di halaman detail, gambar diletakkan
absolut di panggung yang ukurannya tidak bergantung pada gambar.

Warna badge kategori (kartu daftar dan tag di halaman detail) diambil dari nama kategori di data: token
`--category-<kunci>` (latar lembut) dan `--category-<kunci>-ink` (teks & garis tepi) di `tokens.css`, light dan dark,
lewat `components/catalog/categoryTone.js` (kunci = nama huruf kecil dengan tanda hubung, mis. `sea-fishing`). Common
putih di light dan netral di dark; tiap kategori event (termasuk yang belum punya entri) punya warna sesuai temanya, dan
kategori yang belum terdaftar memakai `--category-fallback`. Judul section event di halaman daftar memakai token yang sama. Badge kategori bergaya latar lembut + garis tepi, sedangkan
badge level blok warna penuh.

Warna badge level di kartu (dan badge level di detail resep) diambil dari nomor level di data: token `--level-N` (latar) dan `--level-N-ink` (teks) di `tokens.css`, versi light dan dark, lewat `components/wildlife/levelTone.js`. Urutannya naik dari hijau, teal, biru, ungu, merah muda, oranye, sampai emas di Lv. 14; level tanpa token (di atas 14) otomatis memakai `--level-fallback`.

## Aturan data

Semua data game wajib diambil dari sumber valid, utamanya [Heartodex](https://www.heartodex.com/en/fish). Jangan mengarang. Data yang tidak ditemukan diisi `null` dan diberi komentar `TODO`.

## Menambah ikan, serangga, burung, hewan, resep, tanaman, atau collectible baru

Tidak perlu mengubah komponen. Filter di halaman list juga otomatis mengambil opsi dari data.

### Dengan skrip (disarankan)

`scripts/heartodex-sync.mjs` mengambil data dari halaman daftar dan detail Heartodex (`--kind fish`, `bugs`, `birds`, `animals`, `recipes`, `crops`, atau `collectibles`), mengunduh gambar, menyalin poligon zona (zona yang sama dipakai bersama), lalu memvalidasi hasilnya dengan skema aplikasi.

1. Dry run dulu untuk melihat hasilnya:
   ```bash
   node scripts/heartodex-sync.mjs --kind fish --section "Base Game" --level 2
   node scripts/heartodex-sync.mjs --kind bugs --slug green-tiger-beetle --slug apollo
   node scripts/heartodex-sync.mjs --kind birds --section "Base Game" --level 1
   node scripts/heartodex-sync.mjs --kind animals --section "Base Game"
   node scripts/heartodex-sync.mjs --kind recipes --section "Base Game" --level 7
   node scripts/heartodex-sync.mjs --kind crops --section "Echo of Ancients"
   node scripts/heartodex-sync.mjs --kind collectibles --section "Base Game"
   ```
2. Tulis terjemahan Indonesia yang setia pada teks asli (lihat baris `EN:` di laporan) ke `scripts/translations/<kind>.id.json` (`fish`, `bugs`, `birds`, `animals`, `recipes`, `crops`, `collectibles`), dengan format `{ "slug": "terjemahan" }` (tanaman & collectible: `{ "text": …, "sourceLang": "es" }` kalau teks aslinya di situs EN berbahasa Spanyol).
3. Jalankan lagi dengan `--write`. Skrip menyisipkan entri baru (dengan `section` dari posisinya di halaman daftar) sesuai urutan section, level, lalu urutan di halaman daftar, menambahkan zona baru di `locationZones.js`, menambahkan benda baru (bahan/makanan) di `items.js`, dan mengunduh gambar ke `public/images/<kind>/` dan `public/images/items/`.
4. Periksa komentar `TODO` di entri baru, lalu jalankan `npm run build`.

Aturan yang dijaga skrip:
- Ada jeda 2 detik antar request.
- Semua halaman disimpan di `scripts/.cache/heartodex/` dan tidak diambil ulang. Hapus file cache-nya kalau sumber diperbarui.
- Entri yang sudah ada (di file data wildlife, `recipes.js`, maupun `items.js`) dan gambar yang sudah ada tidak pernah ditimpa. Setelah menulis, data lama semua kategori, benda, dan zona lama dicek ulang, dan file dikembalikan kalau ada yang berubah.
- Data yang tidak ketemu diisi `null` dengan komentar `TODO`. Terjemahan yang belum ada juga begitu.
- Kata di deskripsi sumber yang tampak salah ketik "y" → "g" (mis. "easilg", "preg", "furrg") ditandai di laporan. `descriptionOriginal` tetap disimpan apa adanya; terjemahan mengikuti maksud aslinya. Tabel review terjemahan ada di `scripts/translations/review-<kind>.md` (fish, bugs, birds, animals, recipes, crops, collectibles) dan `review-<kind>-event.md` untuk entri event Fish, Bugs, Birds, Animals, dan Recipes.
- Deskripsi diambil dari JSON-LD dan dicek silang dengan bagian About. JSON-LD Heartodex terpotong di 160 karakter, jadi kalau teks About lebih panjang dan diawali teks yang sama, teks About yang dipakai. Kotak "Expert Tip" (petunjuk lokasi buatan Heartodex) tidak dimasukkan ke deskripsi; isinya dicatat di laporan dan file review.
- Folder cache `scripts/.cache/` masuk `.gitignore`.
- Label lokasi diambil dari halaman detail. Huruf besar-kecilnya dicari di tabel lokasi peta Heartodex, halaman daftar, atau label yang sudah ada. Kalau tidak ketemu, label kapital dari sumber dirapikan dan diberi `TODO` untuk dicek. Kalau label di halaman detail berbeda dari halaman daftar, versi detail yang dipakai dan perbedaannya dicatat sebagai `TODO`.
- Bugs & Birds: satu entri bisa punya beberapa lokasi (dipisah " · " di halaman detail). Ikan juga, khusus yang di sumber punya beberapa lokasi (ikan event Frostspore: lokasi biasa + lokasi event): ikan itu memakai `locations` seperti serangga, ikan lain tetap `location` + `locationZone`. Label lokasi berbahasa Spanyol tanpa versi Inggris di Heartodex diterjemahkan lewat `SPANISH_LOCATION_LABELS` di skrip dan diberi `TODO`. Poligon gabungan di peta halaman detail dipisah per lokasi dengan mencocokkannya ke zona di skrip peta Heartodex, dan potongan peta hasil hitungan aplikasi dicek sama dengan halaman detail.
- Harga jual wildlife dibaca per bintang (jumlah ikon bintang di tiap sel). Kualitas yang tidak dicantumkan sumber (mis. burung event yang hanya punya 1★–2★) diisi `null` + `TODO`, dicatat di `marketValueMissing`, dan tampil "—"; blok harga yang kosong → `marketValue: null`.
- Bugs & Birds: angka per kualitas wajib bilangan bulat. Angka desimal di sumber diisi `null` dengan `TODO` berisi nilai aslinya dan tampil "Belum pasti" (tidak dibulatkan). Gambarnya tidak persegi, jadi ukuran aslinya disimpan di `imageSize` untuk width/height `<img>`.
- Birds: burung dipotret, bukan ditangkap. Deretan 5 angka "Market Value" di Heartodex adalah harga jual Info Card (foto) kualitas 1★–5★, jadi judulnya di halaman detail "Harga jual Info Card" (`priceLabel` di `wildlifeKinds.js`).
- Animals: halaman daftar hewan tidak punya judul "Base Game" (hewan Common tampil paling atas), jadi entri sebelum bagian event dianggap Base Game. Lokasi dari daftar "Location" di halaman detail. Titik tempat makan (`feedingSpot`) dari pin di peta halaman detail, dicek sama dengan marker `flymark` di skrip peta (`flylat`/`flylng` hanya titik tengah kamera). Jenis makanan tertulis dalam bahasa Spanyol di sumber; jenis diambil dari bagian URL dan disimpan dengan istilah game berbahasa Inggris.
- Recipes: deskripsi dari bagian About (dicek sama dengan JSON-LD), disimpan tanpa tanda kutip. Energi dan harga jual per bintang wajib bilangan bulat: "---" atau bintang yang tidak ada di sumber diisi `null` + `TODO` (tampil "—"); angka desimal diisi `null` + `TODO` berisi nilai aslinya dan dicatat di `uncertain` (tampil "Belum pasti"). Blok Market tanpa harga per bintang (mis. hanya "Sell Price 0") → `marketValue: null` + `TODO`. Bahan yang tercantum dua kali di sumber disimpan apa adanya dengan `TODO`. Buff hanya disimpan kalau sumbernya mencantumkan; saat ini tidak ada, jadi `buffs: null`. Nama resep yang ejaannya janggal (mis. "Bizzare Drink") disimpan apa adanya. Cooking Mastery tidak disimpan. `family` resep baru diusulkan dari aturan di `families.js` (tanpa aturan yang cocok: slug-nya sendiri); cek dan ubah manual kalau perlu.
- Benda baru diambil dari halamannya sendiri (nama dari judul, gambar utama ke `public/images/items/<bagian>-<slug>.webp`). Bahan tanpa halaman di sumber (mis. "Any Fish") disimpan sebagai benda generik `any/<jenis>` tanpa gambar. Bahan/makanan berjenis Crop atau Collectible tidak ditulis ke `items.js`: entrinya harus sudah ada di `crops.js`/`collectibles.js` (sinkronkan dulu dengan `--kind crops`/`--kind collectibles`). Bahan berupa ikan/resep yang entrinya sudah ada (atau resep yang ditambahkan di run yang sama) memakai gambar entri itu, tidak diunduh lagi.
- Section: judul pemisah di halaman daftar Heartodex dibaca tanpa label status ("Active Event"/"Finished Event"); halaman hewan dan collectible tidak punya judul "Base Game", jadi entri sebelum judul pertama dianggap Base Game. Section event baru harus ditambahkan dulu di `src/data/events.js` (dengan tanggal mulai dan sumbernya).
- Crops: level dari halaman daftar; harga benih (Buy Price) dan waktu tumbuh (Growth Time, disimpan dalam detik) dari halaman detail; semua deret per bintang (Market Value, Event Tokens, …) disimpan dengan label aslinya di `starValues`, kualitas yang tidak ada di sumber diisi `null` + `TODO` (tampil "—"). Farming Mastery tidak disimpan.
- Collectibles: nilai jual (Sell Value) dan energi (Energy Boost; `null` kalau sumber tidak mencantumkan) bilangan bulat. Lokasi & zona seperti serangga. Pin di peta halaman detail hanya satu titik contoh (marker `flymark`) dari banyak titik benda itu, jadi tidak disimpan; peta memakai zona. Konten Call of Whales memakai peta bawah laut Whalefall Canyon (`BASE_MAPS` di skrip), yang diunduh sekali ke `public/images/maps/`.

### Manual

Contoh untuk ikan dengan slug `barbel`:

1. Buka `https://www.heartodex.com/en/fish/barbel`.
2. Unduh gambar ikannya (URL `/_astro/...webp` pada gambar utama; hash-nya bisa berubah, jadi ambil langsung dari halaman) ke `public/images/fish/barbel.webp`.
3. Tambahkan objek baru di array `fish` dalam `src/data/wildlife/fish.js`, ikuti skema di file itu:
   - `level`, `shadow`, `marketValue` (5 angka, 1★–5★), `category`, `descriptionOriginal`, `schedule`, `weather`, dan `location` diambil dari halaman detail.
   - `description` adalah terjemahan Indonesia yang setia pada teks asli.
   - `source` diisi URL halaman detail.
4. Lokasi:
   - Kalau zona lokasinya sudah ada di `locationZones.js` (mis. `all-seas-and-ocean`), isi `locationZone` dengan kuncinya dan `locationImage: '/images/maps/heartopia-map.webp'`.
   - Kalau zonanya baru, salin poligon dari `<mask>` di SVG "Location on Map" halaman detail ke `locationZones.js` dengan kunci baru. Kalau belum sempat, isi `locationZone: null` dan `locationImage: null` supaya tampil placeholder.
5. Jalankan `npm run dev`. Kalau ada nilai yang salah ketik (mis. shadow atau weather yang tidak dikenal), console akan menampilkan peringatan `[data ikan]` (atau `[data serangga]` / `[data burung]` / `[data hewan]` / `[data resep]` / `[data benda]`).

Untuk serangga dan burung polanya sama, dengan `locations: [{ name, zone }]` (satu objek per lokasi, `zone: null` kalau tidak ada zona) dan tanpa `shadow`.

## Kredit

Data game (nama, statistik, jadwal, cuaca, lokasi, resep, dan bahan), gambar, serta peta dan zona lokasi berasal dari [Heartodex](https://www.heartodex.com). Waktu server juga dicocokkan dengan [heartopialog.com](https://www.heartopialog.com/2026/03/heartopia-server-list-timezone-guide.html).

Hatowiki adalah proyek komunitas tidak resmi untuk Heartopia dan tidak berafiliasi dengan XD Entertainment Co., Ltd. Semua aset game adalah milik XD Entertainment Co., Ltd.
