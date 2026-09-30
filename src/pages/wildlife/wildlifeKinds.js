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
 * level, jadwal, makanan favorit, kategori entri) diambil dari WILDLIFE_CATEGORIES; di sini ditambah data dan tampilan.
 * Teksnya (label, hobi, intro, label harga, …) ada di src/i18n/messages, kunci `kinds.<slug>`.
 */
function defineKind(slug, config) {
  const category = getWildlifeCategory(slug)
  return {
    ...category,
    icon: WILDLIFE_ICONS[slug],
    filters: buildListFilters(category),
    // Tanpa level (hewan): hanya urutan default dan A–Z.
    sortOptions: category.hasLevel ? SORT_OPTIONS : SORT_OPTIONS_NO_LEVEL,
    ...config,
  }
}

export const WILDLIFE_KINDS = {
  fish: defineKind('fish', {
    entries: fish,
    totalInGame: FISH_TOTAL_IN_GAME,
    // Panggung gambar di halaman detail diberi riak air.
    waterStage: true,
    // Harga jual null: belum ada di sumber ("—").
    missingPrice: 'dash',
  }),
  bugs: defineKind('bugs', {
    entries: bugs,
    totalInGame: BUGS_TOTAL_IN_GAME,
    waterStage: false,
    // Harga jual null: harga di sumber desimal (tidak dibulatkan), lihat TODO di bugs.js ("Belum pasti").
    missingPrice: 'uncertain',
  }),
  birds: defineKind('birds', {
    entries: birds,
    totalInGame: BIRDS_TOTAL_IN_GAME,
    waterStage: false,
    // Burung dipotret, bukan ditangkap: yang dijual adalah Info Card (foto) berkualitas 1★–5★ (lihat birds.js), jadi
    // judul harganya "Harga jual Info Card" (kinds.birds.priceLabel).
    // Angka null: angka di sumber desimal (tidak dibulatkan), lihat TODO di birds.js ("Belum pasti").
    missingPrice: 'uncertain',
  }),
  animals: defineKind('animals', {
    entries: animals,
    totalInGame: ANIMALS_TOTAL_IN_GAME,
    waterStage: false,
  }),
}
