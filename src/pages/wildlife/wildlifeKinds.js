import { ANIMALS_TOTAL_IN_GAME, animals } from '../../data/wildlife/animals'
import { BIRDS_TOTAL_IN_GAME, birds } from '../../data/wildlife/birds'
import { BUGS_TOTAL_IN_GAME, bugs } from '../../data/wildlife/bugs'
import { getWildlifeCategory } from '../../data/wildlife/categories'
import { FISH_TOTAL_IN_GAME, fish } from '../../data/wildlife/fish'
import { SORT_OPTIONS, SORT_OPTIONS_NO_LEVEL } from '../catalog/listState'
import { buildListFilters } from './listFilters'
import { WILDLIFE_ICONS } from './wildlifeIcons'

/**
 * Konfigurasi halaman daftar & detail per kategori wildlife. Skema data (shadow, lokasi jamak, harga bulat,
 * level, jadwal, makanan favorit, kategori entri) diambil dari WILDLIFE_CATEGORIES; di sini ditambah data,
 * teks, dan tampilan.
 */
function defineKind(slug, config) {
  const category = getWildlifeCategory(slug)
  return {
    ...category,
    icon: WILDLIFE_ICONS[slug],
    // Kata benda untuk teks UI, mis. "Cari nama ikan…", "Menampilkan 12 dari 97 serangga".
    noun: category.label.toLowerCase(),
    filters: buildListFilters(category),
    // Tanpa level (hewan): hanya urutan default dan A–Z.
    sortOptions: category.hasLevel ? SORT_OPTIONS : SORT_OPTIONS_NO_LEVEL,
    // Judul deretan 5 angka per kualitas di halaman detail.
    priceLabel: 'Harga jual',
    ...config,
  }
}

export const WILDLIFE_KINDS = {
  fish: defineKind('fish', {
    entries: fish,
    totalInGame: FISH_TOTAL_IN_GAME,
    intro: 'Ikan yang bisa kamu tangkap lewat hobi fishing. Pilih ikan untuk melihat jadwal, cuaca, lokasi, dan harga jualnya.',
    // Panggung gambar di halaman detail diberi riak air.
    waterStage: true,
    // Harga jual null: belum ada di sumber.
    missingPrice: '—',
  }),
  bugs: defineKind('bugs', {
    entries: bugs,
    totalInGame: BUGS_TOTAL_IN_GAME,
    intro:
      'Serangga yang bisa kamu tangkap lewat hobi bug hunting. Pilih serangga untuk melihat jadwal, cuaca, lokasi, dan harga jualnya.',
    waterStage: false,
    // Harga jual null: harga di sumber desimal (tidak dibulatkan), lihat TODO di bugs.js.
    missingPrice: 'Belum pasti',
  }),
  birds: defineKind('birds', {
    entries: birds,
    totalInGame: BIRDS_TOTAL_IN_GAME,
    intro:
      'Burung yang bisa kamu potret lewat hobi bird watching. Pilih burung untuk melihat jadwal, cuaca, lokasi, dan harga jual Info Card-nya.',
    waterStage: false,
    // Burung dipotret, bukan ditangkap: yang dijual adalah Info Card (foto) berkualitas 1★–5★ (lihat birds.js).
    priceLabel: 'Harga jual Info Card',
    // Angka null: angka di sumber desimal (tidak dibulatkan), lihat TODO di birds.js.
    missingPrice: 'Belum pasti',
  }),
  animals: defineKind('animals', {
    entries: animals,
    totalInGame: ANIMALS_TOTAL_IN_GAME,
    intro:
      'Hewan liar yang berkeliaran di sekitar map. Pilih hewan untuk melihat lokasi, titik tempat makan, cuaca favorit, dan makanan favoritnya.',
    waterStage: false,
  }),
}
