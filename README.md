# Hatowiki

Wiki komunitas Heartopia (proyek fan, tidak resmi) dalam tiga bahasa: Indonesia (bawaan, alamat tanpa awalan), Thai
(`/th`), dan Inggris (`/en`). Lihat [Bahasa](#bahasa), [Deskripsi isian manual](#deskripsi-isian-manual), dan [SEO](#seo).

Tahap sekarang: kategori **Wildlife**, dengan **Fish** berisi 124 ikan (97 Base Game + 27 event), **Bugs** berisi 101 serangga (76 + 25), **Birds** berisi 103 burung (77 + 26), dan **Animals** berisi 11 hewan (8 + 3), serta **Recipes** berisi 208 resep (87 Base Game + 121 dari 13 event). Kategori Wiki **Crops** berisi 19 tanaman (14 Base Game + 5 event) dan **Collectibles** berisi 40 bahan alam (33 Base Game + 7 event), ditambah **Ingredients** (32 bahan masak), **Items** (23 benda pakai per hobi), **NPCs** (19 NPC), dan **Achievements** (70 achievement, 1 tersembunyi). Semua entri di halaman daftar Heartodex sudah dimasukkan. Halaman **Checklist** (`/checklist`) melacak koleksi pemain; lihat [Checklist](#checklist).

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

Uji lain yang ikut `npm run test:ui`:

- `scripts/qa/i18n.test.mjs`: tiga bahasa (routing `/th` & `/en`, teks antarmuka, deskripsi per bahasa, isian manual,
  pemilih bahasa, aturan notifikasi saran bahasa).
- `scripts/qa/links.test.mjs`: semua yang berpindah halaman adalah tautan sungguhan (hasil pencarian global bisa dibuka
  di tab baru lewat klik tengah, Ctrl+klik, atau klik kanan; keyboard panah/Enter/Escape tetap jalan).
- `scripts/qa/new-catalogs.test.mjs`: Achievements, Items, dan NPCs (data, daftar, filter, pencarian, detail, tujuan
  achievement tersembunyi yang buram sampai diklik, "Dijual oleh" dari data NPC, barang dagangan & hadiah favorit NPC,
  nama NPC tertaut di "Didapat dari" bahan masak, menu, pencarian global, bento beranda, tiga bahasa).
- `scripts/qa/checklist.test.mjs`: Checklist dengan jam halaman dikunci (menandai lewat ketuk/klik & keyboard, Batalkan,
  filter & pencarian, Target Sekarang: level, cuaca, server & periode berikutnya, reset dengan konfirmasi, Cadangkan &
  Pulihkan termasuk berkas yang salah, tidak ada request selain GET, area ketuk ponsel, tiga bahasa); bawaan lebar 390 & 1280.
- `scripts/qa/seo.test.mjs`: meta tag per halaman & bahasa di browser, lalu HTML statis, `sitemap.xml`, `robots.txt`, dan
  rewrite `vercel.json` di `dist/` (jalankan `npm run build` dulu).

```bash
npm run dev        # di terminal lain
npm run test:ui    # butuh Chrome atau Edge; lokasi lain bisa diset lewat CHROME_PATH (uji SEO butuh dist/ dari npm run build)
node scripts/qa/wildlife-list.test.mjs bugs 390   # satu kategori / satu lebar (fish, bugs, birds, animals, recipes, crops, collectibles)
node scripts/qa/home.test.mjs 390                 # beranda & toolbar, satu lebar
node scripts/qa/i18n.test.mjs 1280                # tiga bahasa, satu lebar
node scripts/qa/links.test.mjs 1280               # tautan sungguhan, satu lebar
node scripts/qa/new-catalogs.test.mjs 1280        # Achievements, Items, NPCs & tautan NPC, satu lebar
node scripts/qa/checklist.test.mjs 390 1280       # Checklist, lebar 390 & 1280
node scripts/qa/seo.test.mjs 1280                 # SEO (setelah npm run build)
```

Semua halaman memakai toolbar global yang menempel di atas: logo, menu Wildlife (dropdown Fish, Bugs, Birds,
Animals), menu Wiki (dropdown Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements), tautan Checklist,
pencarian nama di semua kategori, dan tombol tema. Di bawah 760 px menu pindah ke drawer (Checklist tepat setelah
Beranda) dan pencarian ke balik tombol ikon.

Situs memakai client-side routing (`react-router-dom`). Saat build, tiap halaman di tiap bahasa juga mendapat berkas HTML
statis sendiri (lihat [SEO](#seo)), jadi URL seperti `/wildlife/fish/sea-bass` atau `/th/wildlife/fish/sea-bass` bisa
dibuka langsung. Alamat yang tidak punya berkas diarahkan `vercel.json` ke `index.html` bahasanya (SPA fallback).

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
| `/ingredients/:slug` | Detail bahan masak; nama NPC di "Didapat dari" (mis. Toko Massimo) tertaut ke halaman NPC-nya |
| `/items` | Grid kartu (badge kategori hobi, harga, NPC penjual), pencarian, filter Kategori, urutan default & A–Z |
| `/items/:slug` | Detail: identitas & deskripsi (efek/kegunaan), gambar + harga + Dijual oleh (tautan NPC, dihitung dari data NPC) |
| `/npcs` | Grid kartu (peran, lokasi), pencarian nama & peran, filter Lokasi, urutan default & A–Z |
| `/npcs/:slug` | Detail (4 kotak): identitas & gambar (peran), lokasi + peta dengan pin posisi NPC (atau zona), hadiah favorit, barang yang dijual dengan harga (tertaut ke item) |
| `/achievements` | Grid kartu (badge kategori hobi, title hadiah, tujuan; tujuan & title achievement tersembunyi tidak ditampilkan), pencarian nama & title, filter Kategori, urutan default & A–Z |
| `/achievements/:slug` | Detail: identitas & tujuan (achievement tersembunyi: buram sampai diklik), gambar + title & kategori hadiah |
| `/checklist` | Pelacak koleksi: tab Fish/Bugs/Birds/Recipes/Achievements dengan progres, daftar ringkas yang bisa dicentang, Target Sekarang (Fish, Bugs, Birds), reset per kategori, Cadangkan & Pulihkan |

Katalog Items, NPCs, dan Achievements:

- Datanya dari halaman Heartodex (`/en/items`, `/en/npcs`, `/en/achievements`) lewat `node scripts/heartodex-sync-extra.mjs
  --kind items|npcs|achievements [--write]`, yang menulis ulang `src/data/hobbyItems/hobbyItems.js`,
  `src/data/npcs/npcs.js`, dan `src/data/achievements/achievements.js` seluruhnya (terjemahan Indonesia di
  `scripts/translations/<kind>.id.json`, jadi ubah terjemahan di sana). Folder data Items bernama `hobbyItems` karena
  `src/data/items.js` sudah dipakai benda bersama; katalognya tetap `items` (URL `/items`, id benda `items/<slug>`).
- Tujuan (Objective) achievement disimpan sebagai `description`/`descriptionOriginal`, jadi terjemahan Thai/Inggris dan
  isian manual memakai jalur yang sama. Bagian "Pro Tips" Heartodex tidak diambil. Achievement yang di sumber bernama
  "Hidden Achievement N" dengan title "?" ditandai `hidden: true`: tujuannya buram sampai diklik dan tidak masuk meta
  description.
- Penjual item tidak disimpan di data item: halaman item, bahan masak, tanaman, dan collectible menampilkan "Dijual oleh"
  dari daftar "Items for sale" NPC (`src/data/npcSales.js`); tanpa penjual, baris itu tidak tampil (halaman item: "—").
  Nama NPC di teks "Didapat dari" bahan masak otomatis jadi tautan.
- Hadiah favorit NPC di sumber berupa jenis benda ("Prepared meals", "Rare insects"). Yang jelas sama dengan satu halaman
  daftar Hatowiki ditautkan (`src/data/npcs/giftLinks.js`), sisanya teks; labelnya diterjemahkan lewat `giftLabels` di
  `src/i18n/messages`. Peran NPC ("Cooking mentor") tetap bahasa Inggris seperti istilah game.
- Barang dagangan NPC dicocokkan ke katalog Items lewat nama (tautan di sumber memakai slug Spanyol). Barang yang belum
  punya halaman disimpan dengan `item: null` dan tampil tanpa tautan.

Semua halaman daftar dibagi per section: 🎮 Base Game paling atas, lalu satu section per event dari yang paling baru
dimulai sampai yang paling lama (tanggal mulai di `src/data/events.js`, bersumber dari halaman event Heartodex; tidak
ditampilkan). Section ditentukan field `section` di data, yaitu posisi entri di halaman daftar Heartodex, bukan
kategorinya (mis. Striped Red Mullet berkategori Sea Fishing dan Starfall Shard berkategori Meteor Shower tetap di Base
Game). Pencarian, filter, dan urutan berlaku di dalam tiap section; section tanpa hasil disembunyikan. Status event
(aktif/selesai) tidak disimpan maupun ditampilkan. Muncul Sekarang di beranda hanya memakai entri Base Game.

## Checklist

`/checklist` (Thai `/th/checklist`, Inggris `/en/checklist`) berdiri sendiri: halaman daftar & detail lain tidak punya
tombol atau centang apa pun. Kodenya di `src/pages/checklist/`.

- Tab kategori sekaligus ringkasan progres "didapat/total" (total termasuk entri event, sama dengan halaman daftar). Daftar
  memakai baris ringkas (gambar, nama yang tertaut ke detail, level, lokasi, waktu, cuaca; resep: level & kategori;
  achievement: kategori & title). Seluruh baris adalah label kotak centang, jadi satu ketukan di mana saja (kecuali nama)
  menandai atau membatalkan. Filter Belum didapat (bawaan) / Sudah didapat / Semua dan pencarian nama; kategori, filter,
  tampilan, dan kata kunci ada di URL (`?kategori=bugs&status=sudah&tampilan=sekarang&q=…`). Baris yang keluar dari filter
  karena baru ditandai memunculkan notifikasi di bawah layar dengan tombol Batalkan.
- Target Sekarang (Fish, Bugs, Birds; `catchNow.js`): entri Base Game yang belum didapat, cocok dengan cuaca pilihan pemain
  (Sunny, Rainy, Rainbow; cuaca tidak bisa diketahui dari luar game), dan muncul di periode waktu server sekarang,
  dikelompokkan per lokasi (lokasi dengan entri terbanyak di atas; entri dengan beberapa lokasi masuk ke tiap lokasinya).
  Di bawahnya entri yang baru muncul di periode berikutnya beserta jam mulainya. Level hobi (Fishing, Bug Catching,
  Birdwatching; bawaan level tertinggi di data) menyembunyikan entri yang syarat levelnya lebih tinggi; jumlahnya disebut
  dan bisa ditampilkan redup. Entri event tidak ikut karena hanya bisa didapat selama eventnya.
- Penyimpanan (`checklistStore.js`): localStorage `hdx-checklist` = `{ version: 1, obtained: { <kategori>: [slug, …] },
  levels: { <kategori>: level }, updatedAt }`. Slug atau kategori yang belum dikenal tetap disimpan (cadangan dari versi
  lain tidak kehilangan isi), yang dihitung hanya entri yang ada di data. Server memakai kunci `hdx-server` yang sama
  dengan Muncul Sekarang di beranda; cuaca disimpan di sessionStorage (`hdx-checklist-weather`). Perubahan dari tab lain
  ikut tampil (event `storage`).
- Cadangkan mengunduh `hatowiki-checklist-<tanggal>.json` (bentuk yang sama + `app: 'hatowiki'`, `kind: 'checklist'`).
  Pulihkan membaca berkas di browser, menolak berkas yang bukan cadangan Checklist atau dari versi yang lebih baru, lalu
  mengganti progres setelah dikonfirmasi. Reset per kategori juga lewat dialog konfirmasi (level hobi tidak ikut terhapus).
- Progres tidak pernah dikirim ke server mana pun (uji memeriksa tidak ada request selain GET).

## Struktur

```
public/images/fish/           Gambar ikan (diunduh dari Heartodex)
public/images/bugs/           Gambar serangga (diunduh dari Heartodex)
public/images/birds/          Gambar burung (diunduh dari Heartodex)
public/images/animals/        Gambar hewan (diunduh dari Heartodex)
public/images/recipes/        Gambar resep (diunduh dari Heartodex)
public/images/crops/          Gambar tanaman (diunduh dari Heartodex; juga dipakai sebagai gambar bahan)
public/images/collectibles/   Gambar collectible (diunduh dari Heartodex; juga dipakai sebagai gambar bahan)
public/images/hobby-items/    Gambar item/benda pakai (diunduh dari Heartodex; juga dipakai daftar barang dagangan NPC)
public/images/npcs/           Gambar NPC (diunduh dari Heartodex)
public/images/achievements/   Gambar achievement (diunduh dari Heartodex)
public/images/items/          Gambar benda lain: ingredient, resep, ikan (diunduh dari Heartodex)
public/images/maps/           Peta dasar Heartopia dan peta bawah laut Whalefall Canyon (diunduh dari Heartodex)
data/manual/descriptions.json Isian manual: deskripsi dari game untuk entri yang tidak punya deskripsi
api/geo.js                    Fungsi Vercel: kode negara pengunjung (untuk notifikasi saran bahasa)
scripts/
├── heartodex-sync.mjs        Sinkronisasi data dari Heartodex
├── heartodex-sync-extra.mjs  Sinkronisasi Items, NPCs, dan Achievements (lib/heartodex-fetch.mjs: ambil dengan jeda + cache)
├── english-descriptions.mjs  Teks tampilan bahasa Inggris dari teks asli + pembetulan salah ketik
├── manual-descriptions.mjs   Daftar entri tanpa deskripsi (berkas isian manual) & status terjemahannya
├── build-seo.mjs             HTML statis per halaman & bahasa, sitemap.xml, robots.txt (dijalankan vite build)
├── translations/             Terjemahan & review per kategori (<kind>.id|th|en.json, review-*.md, english-corrections.json)
└── qa/                       Uji UI (Chrome headless)
src/
├── App.jsx                   Definisi route
├── styles/tokens.css         Design token: warna (light & dark, termasuk --level-1…14 badge level), font, radius, spacing, bayangan
├── styles/base.css           Reset, tipografi, utilitas (.container, .btn, dll)
├── data/
│   ├── gameTime.js           Server + offset UTC, periode Dawn/Day/Dusk/Night
│   ├── manualDescriptions.js Deskripsi isian manual dari game (data/manual/descriptions.json, sumber "in-game")
│   ├── events.js             Event (nama, emoji, tanggal mulai + sumbernya) untuk urutan section; Base Game
│   ├── items.js              Benda bersama (bahan resep, makanan hewan): id, nama, jenis, gambar, sumber (+ validator);
│   │                         Crop & Collectible diturunkan dari datanya sendiri
│   ├── itemUsage.js          Resep yang memakai sebuah benda & hewan yang menyukainya (dihitung dari data)
│   ├── npcSales.js           NPC penjual sebuah benda & nama NPC di dalam teks (dihitung dari data NPC)
│   ├── hobbyItems/           hobbyItems.js (katalog Items: data + skema), categories.js, validateHobbyItems.js
│   ├── npcs/                 npcs.js (data + skema), categories.js, giftLinks.js (tautan hadiah favorit), validateNpcs.js
│   ├── achievements/         achievements.js (data + skema), categories.js, validateAchievements.js
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
├── i18n/                     Bahasa: locales.js (id, th, en), I18nProvider (useI18n), LocaleLink, format.js (teks & bentuk
│                             jamak), suggestLocale.js (aturan saran bahasa), messages/<bahasa>.json (teks antarmuka)
├── seo/                      pageMeta.js (judul, deskripsi & alamat tiap halaman per bahasa), applyPageMeta.js (pasang ke <head>)
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
    ├── goods/                GoodsListPage (juga daftar NPCs & Achievements), Crop/Collectible/Ingredient/HobbyItemDetailPage,
    │                         GoodsDetailParts (identitas, Dijual oleh, tautan NPC), UsagePanels, goodsKinds.js (Crops, Collectibles, Ingredients, Items)
    ├── npcs/                 NpcDetailPage, NpcCard, npcKind.js
    ├── achievements/         AchievementDetailPage (tujuan tersembunyi buram sampai diklik), AchievementCard, achievementKind.js
    └── checklist/            ChecklistPage, ChecklistRow, CatchNowView (Target Sekarang), BackupPanel, ConfirmDialog,
                              checklistKinds.js, catchNow.js, checklistStore.js (localStorage, cadangan)
```

`components/layout/catalogs.js` mengumpulkan semua katalog (Fish, Bugs, Birds, Animals, Recipes, Crops, Collectibles, Ingredients,
Items, NPCs, Achievements) beserta ikon, teks,
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

## Bahasa

| Bahasa | Alamat | Teks antarmuka | Deskripsi entri |
| --- | --- | --- | --- |
| Indonesia (bawaan) | tanpa awalan | `src/i18n/messages/id.json` | `description` di file data (terjemahan dari teks asli) |
| Thai | `/th/...` | `src/i18n/messages/th.json` | `scripts/translations/<kind>.th.json` (terjemahan AI dari teks asli, belum ditinjau penutur asli) |
| Inggris | `/en/...` | `src/i18n/messages/en.json` | `scripts/translations/<kind>.en.json` (teks asli dengan salah ketik dibetulkan) |

- Slug sama di semua bahasa. Tidak ada awalan `/id` (dialihkan ke alamat tanpa awalan). Nama entri, nama lokasi, dan
  istilah game tetap bahasa Inggris di semua bahasa.
- Komponen mengambil teks lewat `useI18n()` (`src/i18n/I18nProvider.jsx`) dan menaut lewat `Link`/`NavLink` dari
  `src/i18n/LocaleLink.jsx`, yang menambahkan awalan bahasa sendiri. Teks Thai & Inggris (dan font Thai) baru dimuat di
  halaman bahasanya, jadi versi Indonesia tidak ikut menanggungnya.
- Teks boleh memuat `{nama}` dan, untuk bahasa Inggris, bentuk jamak `{count|recipe|recipes}` (`src/i18n/format.js`).
- Pemilih bahasa ada di toolbar (ikon bola dunia) dan footer; pilihan diingat (`localStorage`), dan pengunjung yang pernah
  memilih Thai atau Inggris diarahkan ke versi itu saat membuka alamat tanpa awalan.
- Notifikasi saran bahasa (pojok kiri bawah) mengikuti aturan di `src/i18n/suggestLocale.js`: bahasa browser th/lo atau
  negara TH/LA → Thai; bahasa browser id atau negara ID → Indonesia; bahasa browser ms → tidak ada saran; bahasa browser
  en → Inggris hanya kalau negaranya diketahui dan bukan ID; bahasa lain → Inggris kecuali negaranya ID. Bahasa browser
  didahulukan daripada negara, dan saran hanya muncul kalau berbeda dari bahasa halaman. Negara berasal dari
  `api/geo.js` (header `x-vercel-ip-country` dari Vercel, tanpa layanan pihak ketiga; tidak tersedia saat development).

### Teks Inggris (`<kind>.en.json`)

Versi Inggris menampilkan teks asli heartodex, tapi salah ketik yang jelas berasal dari sumber dibetulkan dulu: pola
y→g ("easilg", "Widelg"), salah baca huruf/angka ("Mid-AIJtumn", "tupe", "Oct0PUS"), huruf besar di tengah kalimat
("Shell", "Will"), dan apostrof. Tanda baca lain mengikuti sumber apa adanya (tanda hubung tidak diubah jadi tanda
pisah). `descriptionOriginal` di file data tidak pernah diubah.

- Daftar pembetulan ditulis tangan di `scripts/translations/english-corrections.json` (`fixes.<kind>.<slug>` = daftar
  `[teks di sumber, pembetulan, jenis]`), termasuk terjemahan Inggris untuk deskripsi yang di sumber berbahasa Spanyol
  (`translations`, mis. Violet Roll Cake & Yellow Roll Cake; ditandai di `_meta.translated`).
- `node scripts/english-descriptions.mjs` menerapkannya dan menulis ulang `<kind>.en.json` serta tabel review
  `scripts/translations/review-<kind>.en.md`. Jalankan lagi setelah menambah entri atau pembetulan. Skrip berhenti kalau
  sebuah pembetulan tidak cocok tepat satu kali, jadi daftar pembetulan tidak bisa diam-diam kedaluwarsa.
- Deskripsi yang disembunyikan di versi Indonesia (salah salin di sumber) juga tidak ditampilkan di versi Inggris & Thai.

## Deskripsi isian manual

Sebagian entri tidak punya deskripsi: teksnya tidak ada di heartodex, atau ada tapi disembunyikan karena salah salin.
Semuanya terdaftar di `data/manual/descriptions.json`, dikelompokkan per kategori, dengan kolom kosong untuk diisi sendiri
dari teks yang terlihat langsung di game:

```json
"asian-arowana": {
  "name": "Asian Arowana",
  "reason": "deskripsi tidak ditemukan di sumber",
  "en": "",
  "id": "",
  "th": ""
}
```

Cara mengisi:

1. Buka `data/manual/descriptions.json`, cari entrinya (nama ada di `name`), lalu isi `en` dengan teks bahasa Inggris
   dari game, apa adanya dan tanpa tanda kutip pembuka/penutup. Kolom `name` dan `reason` tidak perlu diubah.
2. Begitu `en` terisi, situs memakainya sebagai deskripsi asli entri itu dengan sumber `in-game`
   (`src/data/manualDescriptions.js`): versi Inggris langsung menampilkannya, dan teks ini mengalahkan apa pun dari
   heartodex, termasuk teks salah salin yang disembunyikan.
3. Versi Indonesia dan Thai baru menampilkannya setelah terjemahannya ada di kolom `id` dan `th` berkas yang sama.
   Jalankan `node scripts/manual-descriptions.mjs` untuk melihat entri mana yang sudah diisi tapi belum diterjemahkan,
   lalu minta agent (mis. Claude Code) menerjemahkan kolom `en` entri itu ke `id` dan `th`: terjemahan setia pada teks
   asli, nama dan istilah game tetap bahasa Inggris. Skrip itu tidak menerjemahkan sendiri; selama `id`/`th` kosong,
   versi bahasa itu tetap menampilkan "Deskripsi belum tersedia".
4. `npm run build`.

Aturan yang dijaga:

- Skrip sinkronisasi (`heartodex-sync.mjs`) tidak pernah membaca maupun menulis berkas ini, jadi isian tidak bisa
  tertimpa; data dari heartodex tetap disimpan apa adanya di file data.
- `node scripts/manual-descriptions.mjs` memperbarui daftarnya (menambahkan entri baru tanpa deskripsi, membuang baris
  kosong yang entrinya sudah punya deskripsi dari sumber) dan tidak pernah mengubah kolom yang sudah terisi.
  `--check` hanya melaporkan.

## SEO

- `src/seo/pageMeta.js` adalah satu-satunya sumber judul, deskripsi, dan alamat tiap halaman per bahasa. Deskripsi dibuat
  dari data dalam bahasa halamannya, paling panjang 160 karakter: mis. ikan = nama, level, lokasi, waktu muncul, cuaca,
  dan rentang harga jual; resep = level, energi, bahan utama, dan harga jual. Kalimat pembuka selalu ada, keterangan
  lain ditambahkan menurut prioritas selama masih muat. Teksnya di `src/i18n/messages` (`seo.*`, `kinds.<slug>.meta*`).
- Di browser, `Layout` memasang judul, meta description, canonical, Open Graph/Twitter, dan `hreflang` (id, th, en, serta
  `x-default` → versi Inggris) setiap kali pindah halaman atau bahasa (`src/seo/applyPageMeta.js`). Halaman yang tidak ada
  diberi `noindex`.
- Saat `vite build`, plugin di `vite.config.js` menjalankan `scripts/build-seo.mjs`: untuk tiap halaman di tiap bahasa
  ditulis salinan `index.html` dengan meta tag dan atribut `lang` yang sudah diisi (`dist/wildlife/fish/sea-bass/index.html`,
  `dist/th/...`, `dist/en/...`), untuk crawler tanpa JavaScript (WhatsApp, Discord, media sosial). Isi halaman tetap
  dirender React; ini bukan SSR. Skrip yang sama menulis `sitemap.xml` (semua halaman × 3 bahasa dengan `hreflang`) dan
  `robots.txt`. Build berhenti kalau ada judul/deskripsi yang sama di satu bahasa atau deskripsi lebih dari 160 karakter.
- Dua entri yang namanya sama di katalog berbeda (Egg: resep & bahan masak) diberi nama kategori di judulnya, dalam
  bahasa halamannya: "Egg (Resep)" dan "Egg (Bahan Masak)", "Egg (สูตรอาหาร)" dan "Egg (วัตถุดิบทำอาหาร)", "Egg (Recipes)" dan
  "Egg (Ingredients)".
- Di Vercel berkas statis didahulukan daripada rewrite. `vercel.json` hanya menangani alamat yang tidak punya berkas:
  `/th/...` → `/th/index.html`, `/en/...` → `/en/index.html`, sisanya → `/index.html` (kecuali `/api`).

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
4. Periksa komentar `TODO` di entri baru. Jalankan `node scripts/english-descriptions.mjs` (teks Inggris; tambahkan dulu
   pembetulan salah ketik entri baru ke `english-corrections.json` kalau ada) dan `node scripts/manual-descriptions.mjs`
   (daftar entri tanpa deskripsi), tambahkan terjemahan Thai ke `scripts/translations/<kind>.th.json`, lalu
   `npm run build`.

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
