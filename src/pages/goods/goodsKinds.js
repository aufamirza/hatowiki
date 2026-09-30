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
 * detailnya). Nama tampilan mengikuti pola kategori lain: nama Inggris dengan subjudul per bahasa (teksnya di
 * src/i18n/messages, kunci `kinds.<slug>`). Filter mengikuti
 * heartodex: Crops = Level & Kategori, Collectibles = Lokasi & Kategori (collectible tidak punya level), Ingredients =
 * Kategori saja (bahan tidak punya level maupun lokasi).
 */
export const CROP_KIND = {
  slug: 'crops',
  name: 'Crops',
  icon: Sprout,
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
  icon: TreeDeciduous,
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
  icon: ShoppingBasket,
  entries: ingredients,
  totalInGame: INGREDIENTS_TOTAL_IN_GAME,
  entryCategories: INGREDIENT_CATEGORIES,
  detailCategoryEmoji: {},
  sortOptions: SORT_OPTIONS_NO_LEVEL,
  filters: [categoryFilter(INGREDIENT_CATEGORIES)],
  href: (entry) => (entry ? `/ingredients/${entry.slug}` : '/ingredients'),
}

export const GOODS_KINDS = { crops: CROP_KIND, collectibles: COLLECTIBLE_KIND, ingredients: INGREDIENT_KIND }

/**
 * Waktu tumbuh (detik) → "15 menit", "1 jam 30 menit", "13 jam"; null → "—". `i18n` = hasil useI18n() (teks & format
 * angka bahasa halaman).
 */
export function formatGrowthTime(seconds, { t, formatNumber }) {
  if (seconds == null) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const parts = [
    hours && t('goods.growthHours', { count: formatNumber(hours) }),
    minutes && t('goods.growthMinutes', { count: minutes }),
    rest && t('goods.growthSeconds', { count: rest }),
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : t('goods.growthZero')
}
