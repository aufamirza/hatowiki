import { findWildlifeProblems } from './validateWildlife'

/**
 * Data hewan liar Heartopia (kategori Animals). Semua nilai wajib bersumber dari halaman detail Heartodex
 * (https://www.heartodex.com/en/wild-animals/<slug>). Data yang tidak ditemukan diisi `null`
 * dan diberi komentar TODO — jangan ditebak. Hewan tidak punya level, jadwal, shadow, maupun harga jual.
 *
 * @typedef {Object} AnimalLocation
 * @property {string}  name   Label lokasi dari halaman detail.
 * @property {?string} zone   Kunci di LOCATION_ZONES (cadangan kalau titik tempat makan tidak ada); null = tidak ada zona di sumber.
 *
 * @typedef {Object} FeedingSpot
 * @property {number} x  Koordinat titik tempat makan di peta dasar 1000×1000 (sama dengan poligon zona).
 * @property {number} y  Diambil dari pin di peta halaman detail, yaitu marker `flymark` di peta interaktif Heartodex
 *                       (`flylat`/`flylng` di link peta hanyalah titik tengah kamera, bukan tempat makannya).
 *
 * @typedef {Object} Animal
 * @property {string}   slug                Sama dengan slug URL di Heartodex, mis. 'sika-deer'.
 * @property {string}   name                Nama resmi (English).
 * @property {?string}  category            Kunci di ANIMAL_CATEGORIES, mis. 'Common'. null = tidak ada di sumber.
 * @property {string}   section             'Base Game' atau nama event (src/data/events.js), dari posisi entri di halaman
 *                                          daftar Heartodex, bukan dari kategorinya.
 * @property {?string}  description         Terjemahan Indonesia yang setia pada teks asli.
 * @property {?string}  descriptionOriginal Teks asli (English) dari Heartodex, disimpan sebagai referensi (tidak ditampilkan).
 * @property {string[]} weather             Cuaca favorit, subset dari WEATHERS: Rainbow | Sunny | Rainy.
 * @property {AnimalLocation[]} locations   Satu atau lebih lokasi, urut seperti di halaman detail.
 * @property {?FeedingSpot} feedingSpot     Titik tempat makan (pin di peta); null = tidak ada di sumber (peta memakai zona).
 * @property {string[]} favoriteFood        Makanan favorit: id di src/data/items.js, urut seperti di halaman detail.
 * @property {string}   image               Path lokal di /public, mis. '/images/animals/sika-deer.webp'.
 * @property {[number, number]} imageSize   Ukuran asli gambar [lebar, tinggi] untuk width/height <img>.
 * @property {?string}  locationImage       Gambar peta statis dari sumber; null = placeholder.
 * @property {string}   source              URL halaman sumber.
 */

// Jumlah hewan di https://www.heartodex.com/en/wild-animals, semua bagian termasuk event (diperiksa 2026-09-27).
export const ANIMALS_TOTAL_IN_GAME = 11

/** @type {Animal[]} */
export const animals = [
  {
    slug: 'alpaca',
    name: 'Alpaca',
    category: 'Common',
    section: 'Base Game',
    description: 'Llama yang lembut dan ramah ini selalu diam-diam mengamati segala sesuatu di sekitar Flower Field.',
    descriptionOriginal: 'The gentle and friendly llama always quietly observes everything around the Flower Field.',
    weather: ['Sunny'],
    locations: [
      { name: 'Amethyst Beach', zone: 'amethyst-beach' },
    ],
    feedingSpot: { x: 313.5, y: 704.5 },
    favoriteFood: ['crops/pineapple', 'collectibles/blueberry', 'crops/wheat'],
    image: '/images/animals/alpaca.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/alpaca',
  },
  {
    slug: 'capybara',
    name: 'Capybara',
    category: 'Common',
    section: 'Base Game',
    description: 'Keluarga kapibara yang tinggal di Onsen Mountain Ruins sering menatap patung batu raksasa yang mirip dengan diri mereka. Mungkinkah ini petunjuk takdir yang misterius?',
    descriptionOriginal: 'The capybara family living in the Onsen Mountain Ruins often gazes at the giant stone statue that resembles themselves. Could this be some mysterious guidance of fate?',
    weather: ['Rainbow', 'Rainy'],
    locations: [
      { name: 'Crater Lake', zone: 'crater-lake' },
      { name: 'Ruins', zone: 'ruins' },
    ],
    feedingSpot: { x: 319.8, y: 189.5 },
    favoriteFood: ['crops/tomato', 'crops/grape', 'collectibles/raspberry'],
    image: '/images/animals/capybara.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/capybara',
  },
  {
    slug: 'sika-deer',
    name: 'Sika Deer',
    category: 'Common',
    section: 'Base Game',
    description: 'Rusa yang elegan dan anggun saat sedang bersantai ini ternyata sangat gesit ketika berlari menembus hutan.',
    descriptionOriginal: 'The deer, elegant and graceful in its idle poses, is surprisingly swift when running through the forest.',
    weather: ['Sunny'],
    locations: [
      { name: 'Forest Lake', zone: 'forest-lake' },
    ],
    feedingSpot: { x: 799.1, y: 488.3 },
    favoriteFood: ['collectibles/branch', 'crops/lettuce', 'recipes/house-salad'],
    image: '/images/animals/sika-deer.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/sika-deer',
  },
  {
    slug: 'bunny',
    name: 'Bunny',
    category: 'Common',
    section: 'Base Game',
    description: 'Kelinci-kelinci berbulu lembut yang menggemaskan ini adalah peri rumput yang sering muncul di Suburbs.',
    descriptionOriginal: 'The fluffy, adorable bunnies are the grass elves that frequently appear in suburbs',
    weather: ['Sunny'],
    locations: [
      { name: 'Suburbs', zone: 'suburbs' },
    ],
    feedingSpot: { x: 363.3, y: 538.8 },
    favoriteFood: ['crops/strawberry', 'crops/carrot', 'collectibles/weed'],
    image: '/images/animals/bunny.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/bunny',
  },
  {
    slug: 'ferret',
    name: 'Ferret',
    category: 'Common',
    section: 'Base Game',
    description: 'Para ferret kecil yang berlarian di dekat Home dengan penasaran menjelajahi setiap tempat yang cocok untuk bermain, berkejaran, dan tidur bersama.',
    descriptionOriginal: 'The little ferrets scurrying around near the Home curiously explore every spot suitable for playing, frolicking, and sleeping together.',
    weather: ['Rainbow'],
    locations: [
      { name: 'Rosy River', zone: 'rosy-river' },
    ],
    feedingSpot: { x: 283, y: 361.5 },
    favoriteFood: ['ingredients/egg', 'fish/goby', 'fish/sea-bass'],
    image: '/images/animals/ferret.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/ferret',
  },
  {
    slug: 'sea-otter',
    name: 'Sea Otter',
    category: 'Common',
    section: 'Base Game',
    description: 'Di seberang kota, di seberang laut, hiduplah sekelompok berang-berang laut. Mereka lincah dan cerdas, penikmat makanan sejati yang pandai memakai alat.',
    descriptionOriginal: 'Beyond the town beyond the sea, there\'s a group of sea otters. They are lively and intelligent, natural gourmets skilled at using tools.',
    weather: ['Rainy'],
    locations: [
      { name: 'Fishing Village Square', zone: 'fishing-village-square' },
    ],
    feedingSpot: { x: 511.8, y: 739.5 },
    favoriteFood: ['fish/common-prawn', 'fish/oriental-shrimp', 'fish/mussel'],
    image: '/images/animals/sea-otter.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/sea-otter',
  },
  {
    slug: 'panda',
    name: 'Panda',
    category: 'Common',
    section: 'Base Game',
    description: 'Beberapa panda gemuk datang ke hutan dan menjalani hidup sederhana: tidur dan makan bambu setiap hari.',
    descriptionOriginal: 'Some chubby pandas arrived in the forest, living a simple life of sleeping and eating bamboo every day.',
    weather: ['Rainy'],
    locations: [
      { name: 'Forest Jump Puzzle', zone: 'forest-jump-puzzle' },
    ],
    feedingSpot: { x: 760.1, y: 649.3 },
    favoriteFood: ['crops/corn', 'collectibles/bamboo', 'collectibles/apple'],
    image: '/images/animals/panda.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/panda',
  },
  {
    slug: 'fox',
    name: 'Fox',
    category: 'Common',
    section: 'Base Game',
    description: 'Rubah yang gesit dan cerdik ini adalah penjaga wilayah yang andal, dan kini ia mendapat tugas menjaga Flower Field.',
    descriptionOriginal: 'The agile and clever fox, an excellent patroller of the territory, now has the mission of guarding the Flower Field.',
    weather: ['Rainbow'],
    locations: [
      { name: 'Windmill Flower Field', zone: 'windmill-flower-field' },
      { name: 'Amethyst Beach', zone: 'amethyst-beach' },
      { name: 'Meadow Lake', zone: 'meadow-lake' },
    ],
    feedingSpot: { x: 239.8, y: 564.7 },
    favoriteFood: ['fish/largemouth-bass', 'fish/european-perch', 'ingredients/meat'],
    image: '/images/animals/fox.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/fox',
  },
  {
    slug: 'dolphin',
    name: 'Dolphin',
    category: 'Call of Whales',
    section: 'Call of Whales',
    description: 'Apakah lumba-lumba yang menunggangi arus ke Whalefall Canyon itu kebetulan lewat karena nutrisi yang teraduk di perairan jernih, atau mereka sedang mengikuti panggilan samudra yang dalam dan misterius?',
    descriptionOriginal: 'Did the dolphins riding the current to Whalefall Canyon just happen to pass by because of nutrients stirring in the clean waters, or were they following some deep, mysterious call from the ocean?',
    weather: ['Sunny'],
    locations: [
      { name: 'Whalefall', zone: 'whalefall' },
    ],
    feedingSpot: { x: 511.8, y: 557.8 },
    favoriteFood: ['fish/sea-bass', 'fish/sardine', 'fish/scad'],
    image: '/images/animals/dolphin.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/whalefall-canyon.webp',
    source: 'https://www.heartodex.com/en/wild-animals/dolphin',
  },
  {
    slug: 'maltese',
    name: 'Maltese',
    category: 'Maltese',
    section: 'Maltese',
    description: 'Dunia seekor Maltese itu sederhana—asal kamu mau bermain denganku, kita sahabat!',
    descriptionOriginal: 'A Maltese\'s world is simple—as long as you play with me, we\'re best friends!',
    weather: ['Sunny'],
    locations: [
      { name: 'Forest Island', zone: 'forest-island' },
    ],
    feedingSpot: { x: 944.5, y: 345 },
    favoriteFood: ['ingredients/meat', 'recipes/grilled-mushrooms'],
    image: '/images/animals/maltese.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/maltese',
  },
  {
    slug: 'penguin',
    name: 'Penguin',
    category: 'Winter frost season',
    section: 'Winter frost season',
    description: 'Di tengah iklim kutub yang membekukan, hiduplah sekelompok penguin yang jarang pergi jauh dari rumah... tapi pengecualian tetap ada.',
    descriptionOriginal: 'Amid the frigid polar climate lives a colony of penguins who rarely venture far from home... but exceptions do happen.',
    weather: ['Rainy'],
    locations: [
      { name: 'Old Sea', zone: 'old-sea' },
    ],
    feedingSpot: null, // TODO: titik tempat makan tidak ada di sumber (peta memakai zona lokasi)
    favoriteFood: ['fish/false-scad', 'fish/common-prawn', 'fish/sardine'],
    image: '/images/animals/penguin.webp',
    imageSize: [400, 400],
    locationImage: '/images/maps/heartopia-map.webp',
    source: 'https://www.heartodex.com/en/wild-animals/penguin',
  },
]

export function getAnimalBySlug(slug) {
  return animals.find((item) => item.slug === slug)
}

// Pemeriksaan data saat development supaya typo ketahuan begitu hewan baru ditambahkan.
if (import.meta.env.DEV) {
  for (const { slug, problems } of findWildlifeProblems(animals, 'animals')) {
    console.warn(`[data hewan] ${slug}: ${problems.join('; ')}`)
  }
}
