import { findHobbyItemProblems } from './validateHobbyItems'

/**
 * Data item Heartopia (kategori Items): benda pakai yang dikelompokkan per hobi, mis. umpan, pupuk, dan makanan hewan.
 * Semua nilai bersumber dari halaman detail Heartodex (https://www.heartodex.com/en/items/<slug>; urutan dari halaman
 * daftar https://www.heartodex.com/en/items). File ini ditulis ulang seluruhnya oleh
 * scripts/heartodex-sync-extra.mjs --kind items: terjemahan Indonesia diubah di scripts/translations/items.id.json, bukan
 * di sini. Data yang tidak ditemukan diisi `null` dan diberi komentar TODO — jangan ditebak.
 *
 * Folder ini bernama hobbyItems karena src/data/items.js sudah dipakai untuk benda bersama (bahan resep, makanan hewan).
 * Item juga terdaftar sebagai benda bersama dengan id 'items/<slug>' (lihat ALL_ITEMS di src/data/items.js), dipakai
 * daftar barang yang dijual NPC. Penjualnya tidak disimpan di sini: halaman item menghitungnya dari data NPC
 * (src/data/npcs/npcs.js, daftar "Items for sale").
 *
 * @typedef {Object} HobbyItem
 * @property {string}   slug                Sama dengan slug URL di Heartodex, mis. 'mermaid-perfume'.
 * @property {string}   name                Nama resmi (English), apa adanya seperti di sumber.
 * @property {?string}  category            Kategori hobi, kunci di HOBBY_ITEM_CATEGORIES, mis. 'Fishing'.
 * @property {string}   section             Selalu 'Base Game': halaman daftar Heartodex tidak punya section event.
 * @property {?string}  description         Terjemahan Indonesia yang setia pada teks asli (efek/kegunaan ada di sini
 *                                          kalau sumber mencantumkannya).
 * @property {?string}  descriptionOriginal Teks asli dari bagian About; null = About kosong di sumber.
 * @property {string}   [descriptionSourceLang] Kode bahasa teks asli kalau bukan English, mis. 'es' untuk deskripsi yang
 *                                          di situs EN heartodex masih berbahasa Spanyol (diterjemahkan dari teks itu).
 * @property {?number}  price               Harga ("ITEM PRICE"); null = tidak dicantumkan sumber.
 * @property {string}   image               Path lokal di /public, mis. '/images/hobby-items/bait.webp'.
 * @property {[number, number]} imageSize   Ukuran asli gambar [lebar, tinggi] untuk width/height <img>.
 * @property {string}   source              URL halaman sumber.
 */

// Jumlah item di https://www.heartodex.com/en/items (diperiksa 2026-10-01).
export const HOBBY_ITEMS_TOTAL_IN_GAME = 23

/** @type {HobbyItem[]} */
export const hobbyItems = [
  {
    slug: 'inflatable-insect-attractor',
    name: 'Inflatable Insect Attractor',
    category: 'Bug Catching',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: 2000,
    image: '/images/hobby-items/inflatable-insect-attractor.webp',
    imageSize: [400, 379],
    source: 'https://www.heartodex.com/en/items/inflatable-insect-attractor',
  },
  {
    slug: 'mermaid-fish-attractor',
    name: 'Mermaid Fish Attractor',
    category: 'Fishing',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/mermaid-fish-attractor.webp',
    imageSize: [400, 640],
    source: 'https://www.heartodex.com/en/items/mermaid-fish-attractor',
  },
  {
    slug: 'growth-booster',
    name: 'Growth Booster',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/growth-booster.webp',
    imageSize: [400, 465],
    source: 'https://www.heartodex.com/en/items/growth-booster',
  },
  {
    slug: 'quality-growth-booster',
    name: 'Quality Growth Booster',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/quality-growth-booster.webp',
    imageSize: [400, 462],
    source: 'https://www.heartodex.com/en/items/quality-growth-booster',
  },
  {
    slug: 'camouflage-bush',
    name: 'Camouflage Bush',
    category: 'Birdwatching',
    section: 'Base Game',
    description: 'Setelah dipakai, muncul semak yang menyamarkan keberadaanmu dari burung. Bertahan 240 detik.',
    descriptionOriginal: 'Tras su uso, aparece un matorral que camufla tu presencia ante las aves. Dura 240 s.',
    descriptionSourceLang: 'es',
    price: 3000,
    image: '/images/hobby-items/camouflage-bush.webp',
    imageSize: [400, 463],
    source: 'https://www.heartodex.com/en/items/camouflage-bush',
  },
  {
    slug: 'bait',
    name: 'Bait',
    category: 'Fishing',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/bait.webp',
    imageSize: [400, 454],
    source: 'https://www.heartodex.com/en/items/bait',
  },
  {
    slug: 'bird-food',
    name: 'Bird Food',
    category: 'Pets',
    section: 'Base Game',
    description: 'Didapat sebagai imbalan menyerahkan kartu kepada Bailey J.',
    descriptionOriginal: 'Obtained in exchange for delivering cards to Bailey J.',
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/bird-food.webp',
    imageSize: [400, 470],
    source: 'https://www.heartodex.com/en/items/bird-food',
  },
  {
    slug: 'universal-animal-food',
    name: 'Universal Animal Food',
    category: 'Pets',
    section: 'Base Game',
    description: 'Makanan yang memberikan gizi seimbang untuk semua hewan.',
    descriptionOriginal: 'Un alimento que provee nutrición equilibrada a todos los animales.',
    descriptionSourceLang: 'es',
    price: 150,
    image: '/images/hobby-items/universal-animal-food.webp',
    imageSize: [400, 459],
    source: 'https://www.heartodex.com/en/items/universal-animal-food',
  },
  {
    slug: 'amazing-seasoning',
    name: 'Amazing Seasoning',
    category: 'Cooking',
    section: 'Base Game',
    description: 'Dipakai untuk memasak. Meningkatkan kualitas masakan (minimal bintang 2) saat berhasil memasak (tidak berpengaruh kalau gagal).',
    descriptionOriginal: 'Se usa para cocinar. Mejora la calidad de la comida (mínimo de 2 estrellas) cuando se cocina con éxito (sin efecto al fracasar),',
    descriptionSourceLang: 'es',
    price: 3000,
    image: '/images/hobby-items/amazing-seasoning.webp',
    imageSize: [400, 530],
    source: 'https://www.heartodex.com/en/items/amazing-seasoning',
  },
  {
    slug: 'dog-food',
    name: 'Dog Food',
    category: 'Pets',
    section: 'Base Game',
    description: 'Makanan kering bergizi seimbang untuk anjing. Jangan biarkan anjingmu kelaparan!',
    descriptionOriginal: 'Croquetas balanceadas para perros, ¡no dejes que tu perrito pase hambre!',
    descriptionSourceLang: 'es',
    price: 150,
    image: '/images/hobby-items/dog-food.webp',
    imageSize: [400, 450],
    source: 'https://www.heartodex.com/en/items/dog-food',
  },
  {
    slug: 'energy-dog-food',
    name: 'Energy Dog Food',
    category: 'Pets',
    section: 'Base Game',
    description: 'Beri makan anjingmu untuk memulihkan vitalitasnya.',
    descriptionOriginal: 'Alimenta a tu perro para restaurar su vitalidad.',
    descriptionSourceLang: 'es',
    price: 2000,
    image: '/images/hobby-items/energy-dog-food.webp',
    imageSize: [400, 436],
    source: 'https://www.heartodex.com/en/items/energy-dog-food',
  },
  {
    slug: 'cat-food',
    name: 'Cat Food',
    category: 'Pets',
    section: 'Base Game',
    description: 'Makanan bergizi untuk kucing. Jangan biarkan kucingmu kelaparan!',
    descriptionOriginal: 'Comida nutritiva para gatos, ¡no dejes que tu gato pase hambre!',
    descriptionSourceLang: 'es',
    price: 150,
    image: '/images/hobby-items/cat-food.webp',
    imageSize: [400, 446],
    source: 'https://www.heartodex.com/en/items/cat-food',
  },
  {
    slug: 'fertilizer',
    name: 'Fertilizer',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/fertilizer.webp',
    imageSize: [400, 444],
    source: 'https://www.heartodex.com/en/items/fertilizer',
  },
  {
    slug: 'quality-fertilizer',
    name: 'Quality Fertilizer',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/quality-fertilizer.webp',
    imageSize: [400, 443],
    source: 'https://www.heartodex.com/en/items/quality-fertilizer',
  },
  {
    slug: 'universal-ingredient',
    name: 'Universal Ingredient',
    category: 'Cooking',
    section: 'Base Game',
    description: 'Bisa menggantikan bahan apa pun.',
    descriptionOriginal: 'Puede sustituir cualquier ingrediente',
    descriptionSourceLang: 'es',
    price: 2000,
    image: '/images/hobby-items/universal-ingredient.webp',
    imageSize: [400, 406],
    source: 'https://www.heartodex.com/en/items/universal-ingredient',
  },
  {
    slug: 'drawing-board',
    name: 'Drawing Board',
    category: null, // TODO: kategori tidak ada di sumber
    section: 'Base Game',
    description: 'Luapkan kreativitasmu di papan gambar.',
    descriptionOriginal: 'Unleash gour creativity on the drawing board.',
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/drawing-board.webp',
    imageSize: [400, 845],
    source: 'https://www.heartodex.com/en/items/drawing-board',
  },
  {
    slug: 'mermaid-perfume',
    name: 'Mermaid Perfume',
    category: 'Fishing',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/mermaid-perfume.webp',
    imageSize: [400, 457],
    source: 'https://www.heartodex.com/en/items/mermaid-perfume',
  },
  {
    slug: 'energy-fish-jerky',
    name: 'Energy Fish Jerky',
    category: 'Pets',
    section: 'Base Game',
    description: 'Beri makan kucingmu untuk memulihkan vitalitasnya.',
    descriptionOriginal: 'Alimenta a tu gatito para restaurar su vitalidad.',
    descriptionSourceLang: 'es',
    price: 2000,
    image: '/images/hobby-items/energy-fish-jerky.webp',
    imageSize: [400, 432],
    source: 'https://www.heartodex.com/en/items/energy-fish-jerky',
  },
  {
    slug: 'rainbow-breeding-powder',
    name: 'Rainbow Breeding Powder',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: 3000,
    image: '/images/hobby-items/rainbow-breeding-powder.webp',
    imageSize: [400, 524],
    source: 'https://www.heartodex.com/en/items/rainbow-breeding-powder',
  },
  {
    slug: 'sense-booster',
    name: 'Sense Booster',
    category: 'Bug Catching',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: 3000,
    image: '/images/hobby-items/sense-booster.webp',
    imageSize: [400, 609],
    source: 'https://www.heartodex.com/en/items/sense-booster',
  },
  {
    slug: 'auto-bird-whistle',
    name: 'Auto Bird Whistle',
    category: 'Birdwatching',
    section: 'Base Game',
    description: 'Setelah dipakai, burung di sekitar (kecuali yang ada di tempat bertengger) lebih sering beraksi selama 3 menit.',
    descriptionOriginal: 'Tras su uso, las aves cercanas (excepto las del soporte) realizan acciones con más frecuencia durante 3 min.',
    descriptionSourceLang: 'es',
    price: 2000,
    image: '/images/hobby-items/auto-bird-whistle.webp',
    imageSize: [400, 453],
    source: 'https://www.heartodex.com/en/items/auto-bird-whistle',
  },
  {
    slug: 'top-growth-booster',
    name: 'Top Growth Booster',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/top-growth-booster.webp',
    imageSize: [400, 450],
    source: 'https://www.heartodex.com/en/items/top-growth-booster',
  },
  {
    slug: 'top-fertilizer',
    name: 'Top Fertilizer',
    category: 'Gardening',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    price: null, // TODO: harga (ITEM PRICE) tidak ada di sumber
    image: '/images/hobby-items/top-fertilizer.webp',
    imageSize: [400, 470],
    source: 'https://www.heartodex.com/en/items/top-fertilizer',
  },
]

export function getHobbyItemBySlug(slug) {
  return hobbyItems.find((item) => item.slug === slug)
}

// Pemeriksaan data saat development supaya typo ketahuan begitu item baru ditambahkan.
if (import.meta.env.DEV) {
  for (const { slug, problems } of findHobbyItemProblems(hobbyItems)) {
    console.warn(`[data item] ${slug}: ${problems.join('; ')}`)
  }
}
