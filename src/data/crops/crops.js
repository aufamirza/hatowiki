import { findCropProblems } from './validateCrops'

/**
 * Data tanaman Heartopia (kategori Crops). Semua nilai wajib bersumber dari Heartodex
 * (https://www.heartodex.com/en/crops/<slug>; level dari halaman daftar https://www.heartodex.com/en/crops).
 * Data yang tidak ditemukan diisi `null` dan diberi komentar TODO — jangan ditebak. Farming Mastery sengaja tidak disimpan.
 * Tanaman juga dipakai sebagai benda (bahan resep, makanan hewan) dengan id 'crops/<slug>' (lihat src/data/items.js);
 * file ini satu-satunya sumber datanya.
 *
 * @typedef {Object} StarValueRow
 * @property {string} label       Label asli deret di Heartodex, mis. 'Market Value' atau 'Event Tokens'. Artinya tidak
 *                                ditafsirkan; hanya 'Market Value' yang ditampilkan sebagai "Harga jual".
 * @property {(?number)[]} values 5 bilangan bulat untuk kualitas 1★ sampai 5★. Desimal di sumber → null + TODO.
 * @property {number[]} [uncertain] Opsional: indeks bintang (0 = 1★) yang di sumber desimal (tampil "Belum pasti").
 *
 * @typedef {Object} Crop
 * @property {string}   slug                Sama dengan slug URL di Heartodex, mis. 'tomato'.
 * @property {string}   name                Nama resmi (English), apa adanya seperti di sumber.
 * @property {?string}  category            Kunci di CROP_CATEGORIES, mis. 'Common'. null = tidak ada di sumber.
 * @property {string}   section             'Base Game' atau nama event (src/data/events.js), dari posisi entri di halaman
 *                                          daftar Heartodex, bukan dari kategorinya.
 * @property {?string}  description         Terjemahan Indonesia yang setia pada teks asli.
 * @property {?string}  descriptionOriginal Teks asli dari bagian About; null = About kosong di sumber.
 * @property {string}   [descriptionSourceLang] Kode bahasa teks asli kalau bukan English (lihat recipes.js).
 * @property {?number}  level               Level yang dibutuhkan (halaman daftar).
 * @property {?number}  seedPrice           Harga benih ("Buy Price").
 * @property {?number}  growthTime          Waktu tumbuh dalam detik ("Growth Time", di sumber "HH:MM:SSh").
 * @property {StarValueRow[]} starValues    Semua deret angka per bintang, urut seperti di sumber (Market Value dulu).
 * @property {string[]} [uncertain]         Opsional: field angka (mis. 'seedPrice') yang di sumber desimal.
 * @property {string}   image               Path lokal di /public, mis. '/images/crops/tomato.webp'.
 * @property {[number, number]} imageSize   Ukuran asli gambar [lebar, tinggi] untuk width/height <img>.
 * @property {string}   source              URL halaman sumber.
 */

// Jumlah tanaman di https://www.heartodex.com/en/crops, semua section termasuk event (diperiksa 2026-09-28).
export const CROPS_TOTAL_IN_GAME = 19

/** @type {Crop[]} */
export const crops = [
  {
    slug: 'paddy',
    name: 'Paddy',
    category: 'Common',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    level: 1,
    seedPrice: 12,
    growthTime: 1200,
    starValues: [
      { label: 'Market Value', values: [37, 49, 61, 74, 111] },
    ],
    image: '/images/crops/paddy.webp',
    imageSize: [400, 303],
    source: 'https://www.heartodex.com/en/crops/paddy',
  },
  {
    slug: 'potatoes',
    name: 'Potatoes',
    category: 'Common',
    section: 'Base Game',
    description: 'Coba tebak, apa jadinya kalau kentang duduk di sofa? Ia jadi couch potato, si pemalas sofa!',
    descriptionOriginal: 'Guess what happens when a potato sits on a couch? It becomes a couch potato!',
    level: 1,
    seedPrice: 30,
    growthTime: 3600,
    starValues: [
      { label: 'Market Value', values: [90, 120, 150, 180, 210] },
    ],
    image: '/images/crops/potatoes.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/potatoes',
  },
  {
    slug: 'tomato',
    name: 'Tomato',
    category: 'Common',
    section: 'Base Game',
    description: 'Kecil, bulat, dan penuh sinar matahari, bagaikan permata merah mungil dari alam.',
    descriptionOriginal: 'It\'s small, round, and bursting with sunlight, like nature\'s little red gem.',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [
      { label: 'Market Value', values: [30, 40, 50, 60, 70] },
    ],
    image: '/images/crops/tomato.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/tomato',
  },
  {
    slug: 'wheat',
    name: 'Wheat',
    category: 'Common',
    section: 'Base Game',
    description: 'Bukan sekadar bahan makanan, gandum juga baik untuk kesehatan dan penuh manfaat bergizi.',
    descriptionOriginal: 'It\'s more than just food, also good for your health and full of wholesome benefits.',
    level: 2,
    seedPrice: 95,
    growthTime: 14400,
    starValues: [
      { label: 'Market Value', values: [285, 381, 475, 570, 855] },
    ],
    image: '/images/crops/wheat.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/wheat',
  },
  {
    slug: 'lettuce',
    name: 'Lettuce',
    category: 'Common',
    section: 'Base Game',
    description: 'Tanpa selada, salad apa pun tak akan lengkap!',
    descriptionOriginal: 'No salad is complete without it!',
    level: 3,
    seedPrice: 145,
    growthTime: 28800,
    starValues: [
      { label: 'Market Value', values: [435, 582, 726, 870, 1305] },
    ],
    image: '/images/crops/lettuce.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/lettuce',
  },
  {
    slug: 'pineapple',
    name: 'Pineapple',
    category: 'Common',
    section: 'Base Game',
    description: 'Nikmati langsung atau dalam hidangan penutup... tapi jangan jadi pizza nanas!',
    descriptionOriginal: 'Enjoy it fresh or in desserts... but no pineapple pizza!',
    level: 4,
    seedPrice: 15,
    growthTime: 1800,
    starValues: [
      { label: 'Market Value', values: [52, 69, 86, 104, 118] },
    ],
    image: '/images/crops/pineapple.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/pineapple',
  },
  {
    slug: 'carrot',
    name: 'Carrot',
    category: 'Common',
    section: 'Base Game',
    description: 'Bagi sebagian orang, wortel mungkin mimpi buruk masa kecil, tapi ternyata sangat bergizi!',
    descriptionOriginal: 'It may have been a childhood nightmare for some, but it\'s surprisingly nutritious!',
    level: 5,
    seedPrice: 50,
    growthTime: 7200,
    starValues: [
      { label: 'Market Value', values: [155, 207, 258, 310, 350] },
    ],
    image: '/images/crops/carrot.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/carrot',
  },
  {
    slug: 'strawberry',
    name: 'Strawberry',
    category: 'Common',
    section: 'Base Game',
    description: 'Dengan kesegaran manis awal musim semi, stroberi dinobatkan sebagai "Ratu Buah".',
    descriptionOriginal: 'With the sweet freshness of early spring, it\'s crowned as the "Queen of Fruits."',
    level: 6,
    seedPrice: 125,
    growthTime: 21600,
    starValues: [
      { label: 'Market Value', values: [375, 502, 626, 750, 1125] },
    ],
    image: '/images/crops/strawberry.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/strawberry',
  },
  {
    slug: 'corn',
    name: 'Corn',
    category: 'Common',
    section: 'Base Game',
    description: 'Mudah ditanam dan hasil panennya melimpah. Tanaman yang sama sekali tidak bikin pusing.',
    descriptionOriginal: 'Easy to grow, with abundant yields. A crop that doesn’t cause any headaches.',
    level: 6,
    seedPrice: 170,
    growthTime: 43200,
    starValues: [
      { label: 'Market Value', values: [510, 690, 860, 1020, 1545] },
    ],
    image: '/images/crops/corn.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/corn',
  },
  {
    slug: 'grape',
    name: 'Grape',
    category: 'Common',
    section: 'Base Game',
    description: 'Tandannya berisi butiran kecil yang manis, masing-masing penuh sinar matahari di setiap gigitan.',
    descriptionOriginal: 'It has clusters of sweet little orbs, each bursting with sunshine in every bite.',
    level: 7,
    seedPrice: 160,
    growthTime: 36000,
    starValues: [
      { label: 'Market Value', values: [480, 643, 801, 960, 1440] },
    ],
    image: '/images/crops/grape.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/grape',
  },
  {
    slug: 'eggplant',
    name: 'Eggplant',
    category: 'Common',
    section: 'Base Game',
    description: 'Tampilannya sederhana, tapi jagonya menyerap rasa.',
    descriptionOriginal: 'It\'s humble on the outside, but a master of soaking up flavor.',
    level: 8,
    seedPrice: 135,
    growthTime: 18000,
    starValues: [
      { label: 'Market Value', values: [406, 544, 678, 812, 1218] },
    ],
    image: '/images/crops/eggplant.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/eggplant',
  },
  {
    slug: 'tea-leaf',
    name: 'Tea Leaf',
    category: 'Common',
    section: 'Base Game',
    description: 'Berasal dari negeri Timur yang jauh, daun teh menjadi dasar banyak minuman seduh yang lezat.',
    descriptionOriginal: 'From a faraway Eastern land, it serves as the base for many delicious brews.',
    level: 11,
    seedPrice: 25,
    growthTime: 2700,
    starValues: [
      { label: 'Market Value', values: [75, 100, 125, 150, 225] },
    ],
    image: '/images/crops/tea-leaf.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/tea-leaf',
  },
  {
    slug: 'cacao-bean',
    name: 'Cacao Bean',
    category: 'Common',
    section: 'Base Game',
    description: 'Dengan aromanya yang khas dan kaya, biji kakao adalah hadiah alam bagi setiap pencinta makanan manis.',
    descriptionOriginal: 'With its unique rich aroma, it\'s nature\'s gift to every sweet tooth.',
    level: 12,
    seedPrice: 110,
    growthTime: 18000,
    starValues: [
      { label: 'Market Value', values: [330, 442, 551, 660, 990] },
    ],
    image: '/images/crops/cacao-bean.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/cacao-bean',
  },
  {
    slug: 'avocado',
    name: 'Avocado',
    category: 'Common',
    section: 'Base Game',
    description: null, // TODO: deskripsi tidak ada di sumber
    descriptionOriginal: null, // TODO: deskripsi tidak ada di sumber (blok About kosong)
    level: 13,
    seedPrice: 180,
    growthTime: 46800,
    starValues: [
      { label: 'Market Value', values: [540, 810, 1080, 2160, 4320] },
    ],
    image: '/images/crops/avocado.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/avocado',
  },
  {
    slug: 'prickly-pear',
    name: 'Prickly Pear',
    category: 'Echo of Ancients',
    section: 'Echo of Ancients',
    description: 'Sanggup bertahan di gurun sekaligus menguasai piringmu. Hati-hati saja dengan durinya.',
    descriptionOriginal: 'It can survive the desert and take over your plate. Just watch out for the spikes.',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [
      { label: 'Market Value', values: [30, 40, 50, 60, 90] },
      { label: 'Event Tokens', values: [10, 13, 16, 20, 30] },
    ],
    image: '/images/crops/prickly-pear.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/crops/prickly-pear',
  },
  {
    slug: 'starfruit',
    name: 'Starfruit',
    category: 'Call of Whales',
    section: 'Call of Whales',
    description: 'Belimbing biasa, kalau diiris dengan sudut yang pas, berubah menjadi bintang yang berkilau.',
    descriptionOriginal: 'An ordinary starfruit, when sliced at just the right angle, turns into a sparkling star.',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [ // TODO: Market Value tidak ada di sumber untuk 5★; Event Tokens tidak ada di sumber untuk 4★, 5★
      { label: 'Market Value', values: [30, 40, 50, 60, null] },
      { label: 'Event Tokens', values: [20, 26, 33, null, null] },
    ],
    image: '/images/crops/starfruit.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/crops/starfruit',
  },
  {
    slug: 'lemon-verbena',
    name: 'Lemon Verbena',
    category: 'Modular Streets',
    section: 'Modular Streets',
    description: 'Tak ada lemon sama sekali, tapi aroma lemonnya kuat—bahkan lebih segar dan lebih tahan lama.',
    descriptionOriginal: 'No lemons in sight, yet it bursts with a strong lemon fragrance—even fresher and longer-lasting.',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [
      { label: 'Market Value', values: [30, 40, 50, 60, 70] },
      { label: 'Event Tokens', values: [10, 13, 16, 20, 30] },
    ],
    image: '/images/crops/lemon-verbena.webp',
    imageSize: [400, 302],
    source: 'https://www.heartodex.com/en/crops/lemon-verbena',
  },
  {
    slug: 'romaine-lettuce',
    name: 'Romaine Lettuce',
    category: 'Dreamlight Cinematics',
    section: 'Dreamlight Cinematics',
    description: 'Namanya terdengar seperti primadona di keluarga celtuce.',
    descriptionOriginal: 'It sounds like a standout in the celtuce family.',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [
      { label: 'Market Value', values: [30, 40, 50, 60, 70] },
      { label: 'Event Tokens', values: [10, 13, 16, 20, 30] },
    ],
    image: '/images/crops/romaine-lettuce.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/crops/romaine-lettuce',
  },
  {
    slug: 'white-radish',
    name: 'White Radish',
    category: 'Winter frost season',
    section: 'Winter frost season',
    description: '"Ginseng rakyat biasa" yang kaya gizi.',
    descriptionOriginal: 'A nutrient-rich "commoner\'s ginseng."',
    level: 1,
    seedPrice: 10,
    growthTime: 900,
    starValues: [
      { label: 'Market Value', values: [30, 40, 50, 60, 70] },
      { label: 'Event Tokens', values: [10, 13, 16, 20, 30] },
    ],
    image: '/images/crops/white-radish.webp',
    imageSize: [400, 339],
    source: 'https://www.heartodex.com/en/crops/white-radish',
  },
]

export function getCropBySlug(slug) {
  return crops.find((crop) => crop.slug === slug)
}

// Pemeriksaan data saat development supaya typo ketahuan begitu tanaman baru ditambahkan.
if (import.meta.env.DEV) {
  for (const { slug, problems } of findCropProblems(crops)) {
    console.warn(`[data tanaman] ${slug}: ${problems.join('; ')}`)
  }
}
