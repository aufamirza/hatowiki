import { ANIMAL_CATEGORIES, BIRD_CATEGORIES, BUG_CATEGORIES, FISH_CATEGORIES } from './attributes'

/**
 * Kategori di hub /wildlife. Nama kategori mengikuti menu Heartodex (Fish, Bugs, Birds, Animals).
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
 * - `weatherLabel`: nama atribut cuaca di UI ("Cuaca", atau "Cuaca favorit" untuk hewan).
 */
export const WILDLIFE_CATEGORIES = [
  {
    slug: 'fish',
    name: 'Fish',
    label: 'Ikan',
    hobby: 'Hobi fishing',
    description: 'Ikan yang bisa kamu tangkap lewat hobi fishing, lengkap dengan jadwal, cuaca, dan lokasinya.',
    available: true,
    entryCategories: FISH_CATEGORIES,
    hasShadow: true,
    multiLocation: false,
    integerPrices: false,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherLabel: 'Cuaca',
  },
  {
    slug: 'bugs',
    name: 'Bugs',
    label: 'Serangga',
    hobby: 'Hobi bug hunting',
    description: 'Serangga yang bisa kamu tangkap lewat hobi bug hunting, lengkap dengan jadwal, cuaca, dan lokasinya.',
    available: true,
    entryCategories: BUG_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    integerPrices: true,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherLabel: 'Cuaca',
  },
  {
    slug: 'birds',
    name: 'Birds',
    label: 'Burung',
    hobby: 'Hobi bird watching',
    description: 'Burung yang bisa kamu amati lewat hobi bird watching, lengkap dengan jadwal, cuaca, dan lokasinya.',
    available: true,
    entryCategories: BIRD_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    integerPrices: true,
    hasLevel: true,
    hasSchedule: true,
    hasMarketValue: true,
    hasFavoriteFood: false,
    weatherLabel: 'Cuaca',
  },
  {
    slug: 'animals',
    name: 'Animals',
    label: 'Hewan',
    hobby: 'Hewan liar',
    description: 'Hewan liar yang berkeliaran di sekitar map dan bisa kamu beri makan.',
    available: true,
    entryCategories: ANIMAL_CATEGORIES,
    hasShadow: false,
    multiLocation: true,
    // Hewan tidak punya level, jadwal, maupun harga jual; yang ada cuaca favorit dan makanan favorit.
    hasLevel: false,
    hasSchedule: false,
    hasMarketValue: false,
    hasFavoriteFood: true,
    weatherLabel: 'Cuaca favorit',
  },
]

export function getWildlifeCategory(slug) {
  return WILDLIFE_CATEGORIES.find((category) => category.slug === slug)
}
