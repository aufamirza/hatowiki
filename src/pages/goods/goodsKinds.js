import { ShoppingBasket, Sprout, TreeDeciduous } from 'lucide-react'
import { COLLECTIBLE_CATEGORIES } from '../../data/collectibles/categories'
import { COLLECTIBLES_TOTAL_IN_GAME, collectibles } from '../../data/collectibles/collectibles'
import { CROP_CATEGORIES } from '../../data/crops/categories'
import { CROPS_TOTAL_IN_GAME, crops } from '../../data/crops/crops'
import { INGREDIENT_CATEGORIES } from '../../data/ingredients/categories'
import { INGREDIENTS_TOTAL_IN_GAME, ingredients } from '../../data/ingredients/ingredients'
import { LEVEL_FILTER, LOCATION_FILTER, categoryFilter } from '../catalog/filterDefs'
import { SORT_OPTIONS, SORT_OPTIONS_NO_LEVEL } from '../catalog/listState'

/**
 * Konfigurasi halaman daftar & detail Crops, Collectibles, dan Ingredients (untuk CatalogListPage dan halaman
 * detailnya). Nama tampilan mengikuti pola kategori lain: nama Inggris dengan subjudul Indonesia. Filter mengikuti
 * heartodex: Crops = Level & Kategori, Collectibles = Lokasi & Kategori (collectible tidak punya level), Ingredients =
 * Kategori saja (bahan tidak punya level maupun lokasi).
 */
export const CROP_KIND = {
  slug: 'crops',
  name: 'Crops',
  label: 'Tanaman',
  noun: 'tanaman',
  icon: Sprout,
  hobby: 'Hobi farming',
  intro:
    'Tanaman yang bisa kamu tanam lewat hobi farming. Pilih tanaman untuk melihat harga benih, waktu tumbuh, harga jual, dan resep yang memakainya.',
  description: 'Tanaman yang bisa kamu tanam lewat hobi farming, lengkap dengan harga benih, waktu tumbuh, dan harga jualnya.',
  entries: crops,
  totalInGame: CROPS_TOTAL_IN_GAME,
  entryCategories: CROP_CATEGORIES,
  // Di halaman detail tanaman, kategori Common ditandai 🏷️ (bukan 🏠); tetap satu kategori Common di filter & warna.
  detailCategoryEmoji: { Common: '🏷️' },
  sortOptions: SORT_OPTIONS,
  filters: [LEVEL_FILTER, categoryFilter(CROP_CATEGORIES)],
  href: (entry) => (entry ? `/crops/${entry.slug}` : '/crops'),
}

export const COLLECTIBLE_KIND = {
  slug: 'collectibles',
  name: 'Collectibles',
  label: 'Bahan Alam',
  noun: 'bahan alam',
  icon: TreeDeciduous,
  hobby: 'Tersebar di map',
  intro:
    'Buah, jamur, kayu, batu, dan bahan lain yang bisa kamu kumpulkan di sekitar map. Pilih bahan untuk melihat lokasi, nilai jual, energi, dan resep yang memakainya.',
  description: 'Buah, jamur, kayu, dan bahan lain yang bisa kamu kumpulkan di map, lengkap dengan lokasi dan nilai jualnya.',
  entries: collectibles,
  totalInGame: COLLECTIBLES_TOTAL_IN_GAME,
  entryCategories: COLLECTIBLE_CATEGORIES,
  detailCategoryEmoji: {},
  sortOptions: SORT_OPTIONS_NO_LEVEL,
  filters: [LOCATION_FILTER, categoryFilter(COLLECTIBLE_CATEGORIES)],
  href: (entry) => (entry ? `/collectibles/${entry.slug}` : '/collectibles'),
}

export const INGREDIENT_KIND = {
  slug: 'ingredients',
  name: 'Ingredients',
  label: 'Bahan Masak',
  noun: 'bahan masak',
  icon: ShoppingBasket,
  hobby: 'Dibeli di toko',
  intro:
    'Gula, telur, susu, dan bahan masak lain yang bisa kamu beli untuk hobi cooking. Pilih bahan untuk melihat harga, resep yang memakainya, dan hewan yang menyukainya.',
  description: 'Gula, telur, susu, dan bahan masak lain yang bisa kamu beli, lengkap dengan harga dan resep yang memakainya.',
  entries: ingredients,
  totalInGame: INGREDIENTS_TOTAL_IN_GAME,
  entryCategories: INGREDIENT_CATEGORIES,
  detailCategoryEmoji: {},
  sortOptions: SORT_OPTIONS_NO_LEVEL,
  filters: [categoryFilter(INGREDIENT_CATEGORIES)],
  href: (entry) => (entry ? `/ingredients/${entry.slug}` : '/ingredients'),
}

export const GOODS_KINDS = { crops: CROP_KIND, collectibles: COLLECTIBLE_KIND, ingredients: INGREDIENT_KIND }

const formatNumber = new Intl.NumberFormat('id-ID')

/** Waktu tumbuh (detik) → "15 menit", "1 jam 30 menit", "13 jam"; null → "—". */
export function formatGrowthTime(seconds) {
  if (seconds == null) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const parts = [hours && `${formatNumber.format(hours)} jam`, minutes && `${minutes} menit`, rest && `${rest} detik`].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 menit'
}
