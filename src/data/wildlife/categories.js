import { ANIMAL_CATEGORIES, BIRD_CATEGORIES, BUG_CATEGORIES, FISH_CATEGORIES } from './attributes'

/**
 * Kategori di hub /wildlife. Nama kategori mengikuti menu Heartodex (Fish, Bugs, Birds, Animals). Label, hobi, dan
 * deskripsinya ada di teks antarmuka per bahasa (src/i18n/messages, kunci `kinds.<slug>`).
 * `available: false` berarti halamannya masih "Segera Hadir" dan belum berisi data apa pun.
 *
 * Kategori yang sudah berisi data juga membawa skema datanya, dipakai bersama oleh validator,
 * halaman daftar/detail, dan skrip sinkronisasi:
 * - `entryCategories`: kategori entri (Common, event, …) beserta emojinya, dari attributes.js.
 * - `hasShadow`: entri punya field `shadow` (ditampilkan & bisa difilter).
 * - `multiLocation`: lokasi berupa array `locations: [{ name, zone }]`; kalau tidak, `location` + `locationZone`.
 * - `integerPrices`: harga jual wajib bilangan bulat; harga desimal di sumber diisi null ("Belum pasti").
 * - `hasLevel`: entri punya syarat level (badge level di kartu, filter & urutan level, kotak level di detail).
 * - `hasSchedule`: entri punya jadwal muncul (filter "Waktu muncul", baris waktu di kartu, kotak jadwal & waktu server).
 * - `hasMarketValue`: entri punya harga jual per kualitas (kotak harga di detail).
 * - `hasFavoriteFood`: entri punya makanan favorit (`favoriteFood`, id di src/data/items.js) dan titik tempat makan
 *   di peta (`feedingSpot`); dipakai Animals.
 * - `weatherKey`: nama atribut cuaca di UI, kunci teks `filter.<weatherKey>` ("Cuaca", atau "Cuaca favorit" untuk hewan).
 */
export const WILDLIFE_CATEGORIES = [
  {
    slug: 'fish',
    name: 'Fish',
    available: true,
    entryCategories: FISH_CATEGORIES,
    hasShadow: true,
    multiLocation: false,
    integerPrices: false,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherKey: 'weather',
  },
  {
    slug: 'bugs',
    name: 'Bugs',
    available: true,
    entryCategories: BUG_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    integerPrices: true,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherKey: 'weather',
  },
  {
    slug: 'birds',
    name: 'Birds',
    available: true,
    entryCategories: BIRD_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    integerPrices: true,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherKey: 'weather',
  },
  {
    slug: 'animals',
    name: 'Animals',
    available: true,
    entryCategories: ANIMAL_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    // Hewan tidak punya level, jadwal, maupun harga jual; yang ada cuaca favorit dan makanan favorit.
    hasLevel: false,
    hasSchedule: false,
    hasMarketValue: false,
    hasFavoriteFood: true,
    weatherKey: 'favoriteWeather',
  },
]

export function getWildlifeCategory(slug) {
  return WILDLIFE_CATEGORIES.find((category) => category.slug === slug)
}
