import { findNpcProblems } from './validateNpcs'

/**
 * Data NPC Heartopia (kategori NPCs). Semua nilai bersumber dari halaman detail Heartodex
 * (https://www.heartodex.com/en/npcs/<slug>; urutan dari halaman daftar https://www.heartodex.com/en/npcs). File ini
 * ditulis ulang seluruhnya oleh scripts/heartodex-sync-extra.mjs --kind npcs: terjemahan Indonesia diubah di
 * scripts/translations/npcs.id.json, bukan di sini. Data yang tidak ditemukan diisi `null` dan diberi komentar TODO —
 * jangan ditebak.
 *
 * @typedef {Object} NpcLocation
 * @property {string}  name  Nama lokasi (huruf besar-kecil dari tabel lokasi peta Heartodex).
 * @property {?string} zone  Kunci di LOCATION_ZONES (poligon sama persis dengan peta halaman detail); null = tidak ada.
 *
 * @typedef {Object} ShopOffer
 * @property {?string} item   Id benda 'items/<slug>' (katalog Items); null = barang belum punya halaman di Hatowiki.
 * @property {string}  name   Nama barang seperti di sumber.
 * @property {?number} price  Harga di daftar "Items for sale"; null = tidak dicantumkan (sumber menulis 0).
 *
 * @typedef {Object} Npc
 * @property {string}   slug                Sama dengan slug URL di Heartodex, mis. 'massimo'.
 * @property {string}   name                Nama resmi (English), apa adanya seperti di sumber.
 * @property {?string}  category            Kunci di NPC_CATEGORIES, mis. 'Common'.
 * @property {string}   section             Selalu 'Base Game': halaman daftar Heartodex tidak punya section event.
 * @property {?string}  role                Peran di bawah nama (mis. 'Gardening mentor'), istilah game berbahasa Inggris.
 * @property {?string}  description         Terjemahan Indonesia yang setia pada teks asli.
 * @property {?string}  descriptionOriginal Teks asli dari bagian About.
 * @property {string[]} favoriteGifts       Hadiah favorit (bagian "Favorite Gifts") apa adanya, mis. 'Prepared meals';
 *                                          kosong = sumber menulis "None". Terjemahannya di src/i18n/messages (giftLabels).
 * @property {NpcLocation[]} locations      Lokasi di peta (label peta halaman detail).
 * @property {?{ x: number, y: number }} mapPin Posisi NPC di peta dasar 1000×1000 (pin di peta halaman detail = marker
 *                                          `flymark` di peta interaktif Heartodex); null = peta memakai zona lokasi.
 * @property {?string}  locationImage       Gambar peta dasar; null = placeholder.
 * @property {ShopOffer[]} shop             Barang yang dijual ("Items for sale"), urut seperti di sumber.
 * @property {string}   image               Path lokal di /public, mis. '/images/npcs/massimo.webp'.
 * @property {[number, number]} imageSize   Ukuran asli gambar [lebar, tinggi] untuk width/height <img>.
 * @property {string}   source              URL halaman sumber.
 */

// Jumlah NPC di https://www.heartodex.com/en/npcs (diperiksa 2026-10-01).
export const NPCS_TOTAL_IN_GAME = 19

/** @type {Npc[]} */
export const npcs = [
  {
    slug: 'albert-jr',
    name: 'Albert Jr',
    category: 'Common',
    section: 'Base Game',
    role: 'Merchant',
    description: 'Pedagang keliling yang membeli barang-barangmu. Selalu berpindah tempat!',
    descriptionOriginal: 'Wandering merchant who buys your items. Always on the move!',
    favoriteGifts: [],
    locations: [
      { name: 'Suburbs', zone: 'suburbs' },
    ],
    mapPin: null, // TODO: posisi NPC tidak ada di sumber (peta memakai zona lokasi)
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/albert-jr.webp',
    imageSize: [400, 1048],
    source: 'https://www.heartodex.com/en/npcs/albert-jr',
  },
  {
    slug: 'andrew',
    name: 'Andrew',
    category: 'Common',
    section: 'Base Game',
    role: 'Driving mentor', // TODO: peran di sumber setengah Spanyol ("Mentor de Driving"); diterjemahkan mengikuti pola "Cooking mentor", "Fishing mentor", "Gardening mentor"
    description: 'Menjual sepeda motor (hijau, hitam, putih, merah, merah muda), sedan (merah muda, kuning, biru, hitam), dan sepeda gunung. Memberikan kendaraan pemula gratis.',
    descriptionOriginal: 'Sells motorcycles (green, black, white, red, pink), sedans (pink, yellow, blue, black), and mountain bikes. Provides a free starter vehicle.',
    favoriteGifts: [],
    locations: [
      { name: 'Suburbs', zone: 'suburbs' },
    ],
    mapPin: { x: 597.2, y: 400.4 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/andrew.webp',
    imageSize: [400, 810],
    source: 'https://www.heartodex.com/en/npcs/andrew',
  },
  {
    slug: 'annie',
    name: 'Annie',
    category: 'Common',
    section: 'Base Game',
    role: 'Town Guide',
    description: 'Musik dan persahabatan sangat berarti baginya! Tokonya menjual alat musik, emoji, dan animasi. Tips: ada penawaran baru setiap hari, jangan sampai terlewat!',
    descriptionOriginal: 'Music and friendship speak to them! Their shop offers instruments, emojis, and animations. Tip: New deals every day—don’t miss out!',
    favoriteGifts: [],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 177.2, y: 519.6 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/annie.webp',
    imageSize: [400, 1186],
    source: 'https://www.heartodex.com/en/npcs/annie',
  },
  {
    slug: 'atara',
    name: 'Atara',
    category: 'Common',
    section: 'Base Game',
    role: 'Mayor',
    description: 'Wali kota, pemandu cerita utama, sekaligus seorang visioner hebat.',
    descriptionOriginal: 'Mayor of the city, guide to the main story, and great visionary.',
    favoriteGifts: [],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 495.2, y: 521.5 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/atara.webp',
    imageSize: [400, 1000],
    source: 'https://www.heartodex.com/en/npcs/atara',
  },
  {
    slug: 'azure',
    name: 'Azure',
    category: 'Common',
    section: 'Base Game',
    role: 'Winter saleswoman',
    description: 'Menjual token event lewat penjualan barang tertentu.',
    descriptionOriginal: 'Sells event tokens by selling specific items',
    favoriteGifts: [],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: null, // TODO: pin di sumber ada di peta lain (1783816791663-whalecanyon_2gPWn0.webp, flymap=2), tidak cocok dengan zona Central Square di peta utama
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/azure.webp',
    imageSize: [400, 873],
    source: 'https://www.heartodex.com/en/npcs/azure',
  },
  {
    slug: 'bailey-j',
    name: 'Bailey J',
    category: 'Common',
    section: 'Base Game',
    role: 'Bird expert',
    description: 'Pakar burung setempat! Ia akan mendukungmu dengan hadiah untuk hasil pengamatanmu. Ia juga punya toko tempat kamu bisa membeli teropong dan makanan burung.',
    descriptionOriginal: 'The local bird expert! She will support you with rewards for your observations. She also has a shop where you can buy binoculars and bird food.',
    favoriteGifts: ['Bird photographs'],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 527.6, y: 501.9 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/camouflage-bush', name: 'Camouflage Bush', price: 3000 },
      { item: 'items/bird-food', name: 'Bird Food', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/auto-bird-whistle', name: 'Auto Bird Whistle', price: 2000 },
    ],
    image: '/images/npcs/bailey-j.webp',
    imageSize: [400, 570],
    source: 'https://www.heartodex.com/en/npcs/bailey-j',
  },
  {
    slug: 'bill',
    name: 'Bill',
    category: 'Common',
    section: 'Base Game',
    role: 'Advanced fishing mentor',
    description: 'Ahli memancing di laut. Tak ada rahasia laut yang tak ia ketahui.',
    descriptionOriginal: 'Expert in sea fishing. The sea holds no secrets for him.',
    favoriteGifts: ['Fish', 'Seafood'],
    locations: [
      { name: 'Fishing Village Square', zone: 'fishing-village-square' },
    ],
    mapPin: null, // TODO: posisi NPC tidak ada di sumber (peta memakai zona lokasi)
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/bill.webp',
    imageSize: [400, 1003],
    source: 'https://www.heartodex.com/en/npcs/bill',
  },
  {
    slug: 'blanc',
    name: 'Blanc',
    category: 'Common',
    section: 'Base Game',
    role: 'Gardening mentor',
    description: 'Mengajarimu berkebun dan menjual perlengkapan pemula.',
    descriptionOriginal: 'Teaches you gardening and sells starter equipment.',
    favoriteGifts: ['Rare flowers', 'Seeds'],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 560.3, y: 529.6 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/growth-booster', name: 'Growth Booster', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/quality-growth-booster', name: 'Quality Growth Booster', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/fertilizer', name: 'Fertilizer', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/quality-fertilizer', name: 'Quality Fertilizer', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/rainbow-breeding-powder', name: 'Rainbow Breeding Powder', price: 3000 },
      { item: 'items/top-growth-booster', name: 'Top Growth Booster', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/top-fertilizer', name: 'Top Fertilizer', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
    ],
    image: '/images/npcs/blanc.webp',
    imageSize: [400, 874],
    source: 'https://www.heartodex.com/en/npcs/blanc',
  },
  {
    slug: 'bob',
    name: 'Bob',
    category: 'Common',
    section: 'Base Game',
    role: 'The artisan',
    description: 'Kakek kita yang satu ini sangat berbakat dalam membangun. Setiap Sabtu pukul 06.00, ia memperbarui pajangan furnitur yang tersedia selama seminggu. Ajak ia bicara kalau kamu ingin mendapatkan bahan bangunan alami untuk lahanmu.',
    descriptionOriginal: 'Our grandfather has a great talent for building. Every Saturday at 6:00 a.m., he renews the furniture display, which will be available for a week. Talk to him if you want to get natural building materials for your land.',
    favoriteGifts: ['Tools', 'Building Materials'],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 501.6, y: 472.4 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/bob.webp',
    imageSize: [400, 1007],
    source: 'https://www.heartodex.com/en/npcs/bob',
  },
  {
    slug: 'cassie',
    name: 'Cassie',
    category: 'Common',
    section: 'Base Game',
    role: 'Park ranger',
    description: 'Sosok misterius yang berkeliaran di hutan di bawah cahaya bulan.',
    descriptionOriginal: 'A mysterious character who roams the forest under the moonlight.',
    favoriteGifts: [],
    locations: [
      { name: 'Forest Jump Puzzle', zone: 'forest-jump-puzzle' },
    ],
    mapPin: null, // TODO: posisi NPC tidak ada di sumber (peta memakai zona lokasi)
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/cassie.webp',
    imageSize: [400, 978],
    source: 'https://www.heartodex.com/en/npcs/cassie',
  },
  {
    slug: 'doris',
    name: 'Doris',
    category: 'Common',
    section: 'Base Game',
    role: 'Secret Merchant',
    description: 'NPC unik yang hanya muncul saat cuaca khusus (hujan, salju, pelangi, hujan meteor). Menjual resep eksklusif seperti Roll Cake, bahan langka, emote, dan furnitur meteorit. Memakai Star Fragments sebagai mata uang untuk barang meteor.',
    descriptionOriginal: 'Unique NPC who appears only during special weather events (rain, snowfall, rainbow, meteor shower). Sells exclusive recipes like Roll Cake, rare ingredients, emotes, and meteorite furniture. Uses Star Fragments as currency for meteor items',
    favoriteGifts: [],
    locations: [
      { name: 'Suburbs', zone: 'suburbs' },
    ],
    mapPin: null, // TODO: posisi NPC tidak ada di sumber (peta memakai zona lokasi)
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/doris.webp',
    imageSize: [400, 701],
    source: 'https://www.heartodex.com/en/npcs/doris',
  },
  {
    slug: 'dorothee',
    name: 'Dorothee',
    category: 'Common',
    section: 'Base Game',
    role: 'Fashion designer',
    description: 'Ikon gaya sejati! Kamu akan menemukan sepasang sepatu yang sempurna di tokonya. Pilihan pakaiannya diperbarui setiap hari, jadi jangan lupa mampir dan melihat-lihat.',
    descriptionOriginal: 'A true style icon! You\'ll find the perfect pair of shoes in their store. The clothing selection is updated daily, so don\'t forget to stop by and check it out.',
    favoriteGifts: [],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 487.7, y: 474.3 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/dorothee.webp',
    imageSize: [400, 952],
    source: 'https://www.heartodex.com/en/npcs/dorothee',
  },
  {
    slug: 'eric',
    name: 'Eric',
    category: 'Common',
    section: 'Base Game',
    role: 'Park manager',
    description: 'Warga yang ramah, mengelola delegasi harian untuk membantu komunitas.',
    descriptionOriginal: 'Friendly resident, manages daily delegations to assist the community.',
    favoriteGifts: [],
    locations: [
      { name: 'Onsen', zone: 'onsen' },
    ],
    mapPin: { x: 515.6, y: 255.5 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/eric.webp',
    imageSize: [400, 995],
    source: 'https://www.heartodex.com/en/npcs/eric',
  },
  {
    slug: 'ka-ching',
    name: 'Ka Ching',
    category: 'Common',
    section: 'Base Game',
    role: 'Owner of the general store',
    description: 'Pemilik toko serba ada. Apa pun yang kamu butuhkan, ia punya!',
    descriptionOriginal: 'Owner of the general store. If you need it, she has it!',
    favoriteGifts: [],
    locations: [
      { name: 'Residential Street', zone: 'residential-street' },
    ],
    mapPin: { x: 420, y: 413 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/drawing-board', name: 'Drawing Board', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
    ],
    image: '/images/npcs/ka-ching.webp',
    imageSize: [400, 1010],
    source: 'https://www.heartodex.com/en/npcs/ka-ching',
  },
  {
    slug: 'massimo',
    name: 'Massimo',
    category: 'Common',
    section: 'Base Game',
    role: 'Cooking mentor',
    description: 'Koki restoran sekaligus mentor kuliner. Penuh semangat di setiap hidangan.',
    descriptionOriginal: 'Restaurant chef and culinary mentor. Passion in every dish.',
    favoriteGifts: ['Prepared meals', 'Rare ingredients'],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 490.1, y: 443.3 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/amazing-seasoning', name: 'Amazing Seasoning', price: 3000 },
      { item: 'items/universal-ingredient', name: 'Universal Ingredient', price: 2000 },
    ],
    image: '/images/npcs/massimo.webp',
    imageSize: [400, 908],
    source: 'https://www.heartodex.com/en/npcs/massimo',
  },
  {
    slug: 'mrs-joan',
    name: 'Mrs. Joan',
    category: 'Common',
    section: 'Base Game',
    role: 'Proud Pet Parent',
    description: 'Pemilik toko hewan peliharaan. Pencinta semua hewan.',
    descriptionOriginal: 'Owner of the pet store. Lover of all animals.',
    favoriteGifts: [],
    locations: [
      { name: 'Central Square', zone: 'central-square' },
    ],
    mapPin: { x: 522.2, y: 495.8 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/universal-animal-food', name: 'Universal Animal Food', price: 150 },
      { item: 'items/dog-food', name: 'Dog Food', price: 150 },
      { item: 'items/energy-dog-food', name: 'Energy Dog Food', price: 2000 },
      { item: 'items/cat-food', name: 'Cat Food', price: 150 },
      { item: 'items/energy-fish-jerky', name: 'Energy Fish Jerky', price: 2000 },
    ],
    image: '/images/npcs/mrs-joan.webp',
    imageSize: [400, 992],
    source: 'https://www.heartodex.com/en/npcs/mrs-joan',
  },
  {
    slug: 'naniwa',
    name: 'Naniwa',
    category: 'Common',
    section: 'Base Game',
    role: 'The entomologist',
    description: 'Ahli serangga di Heartopia ini akan menunjukkan cara membuat gelembung halus untuk menangkap serangga. Di tokonya, kamu akan menemukan semua yang dibutuhkan untuk hobi ini, termasuk terarium.',
    descriptionOriginal: 'The entomologist at Heartopia will show you how to create delicate bubbles to capture insects. In his shop, you\'ll find everything you need for this hobby, including terrariums.',
    favoriteGifts: ['Rare insects'],
    locations: [
      { name: 'Deer Tower', zone: 'deer-tower' },
    ],
    mapPin: { x: 230.7, y: 409.5 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/inflatable-insect-attractor', name: 'Inflatable Insect Attractor', price: 2000 },
      { item: 'items/sense-booster', name: 'Sense Booster', price: 3000 },
    ],
    image: '/images/npcs/naniwa.webp',
    imageSize: [400, 534],
    source: 'https://www.heartodex.com/en/npcs/naniwa',
  },
  {
    slug: 'patti',
    name: 'Patti',
    category: 'Common',
    section: 'Base Game',
    role: 'Ranger',
    description: 'Penjaga hutan yang ahli, paham betul jalur tersembunyi, makhluk hutan, dan perubahan lingkungan.',
    descriptionOriginal: 'Expert guardian of the forests, knowledgeable about hidden trails, creatures, and changes in the environment.',
    favoriteGifts: [],
    locations: [
      { name: 'Deer Tower', zone: 'deer-tower' },
    ],
    mapPin: null, // TODO: posisi NPC tidak ada di sumber (peta memakai zona lokasi)
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [],
    image: '/images/npcs/patti.webp',
    imageSize: [400, 993],
    source: 'https://www.heartodex.com/en/npcs/patti',
  },
  {
    slug: 'vanya',
    name: 'Vanya',
    category: 'Common',
    section: 'Base Game',
    role: 'Fishing mentor',
    description: 'Mentor memancing. Temukan ketenangan di tepi sungai.',
    descriptionOriginal: 'Fishing mentor. Find peace by the river.',
    favoriteGifts: ['Any fish', 'Seafood', 'Fishing supplies'],
    locations: [
      { name: 'Residential Street', zone: 'residential-street' },
    ],
    mapPin: { x: 159.7, y: 603.9 },
    locationImage: '/images/maps/heartopia-map.webp',
    shop: [
      { item: 'items/mermaid-fish-attractor', name: 'Mermaid Fish Attractor', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/bait', name: 'Bait', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
      { item: 'items/mermaid-perfume', name: 'Mermaid Perfume', price: null }, // TODO: harga tidak dicantumkan (daftar NPC menulis "0")
    ],
    image: '/images/npcs/vanya.webp',
    imageSize: [400, 838],
    source: 'https://www.heartodex.com/en/npcs/vanya',
  },
]

export function getNpcBySlug(slug) {
  return npcs.find((npc) => npc.slug === slug)
}

// Pemeriksaan data saat development supaya typo ketahuan begitu NPC baru ditambahkan.
if (import.meta.env.DEV) {
  for (const { slug, problems } of findNpcProblems(npcs)) {
    console.warn(`[data NPC] ${slug}: ${problems.join('; ')}`)
  }
}
