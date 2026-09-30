import { Trophy } from 'lucide-react'
import { ACHIEVEMENTS_TOTAL_IN_GAME, achievements } from '../../data/achievements/achievements'
import { ACHIEVEMENT_CATEGORIES } from '../../data/achievements/categories'
import { categoryFilter } from '../catalog/filterDefs'
import { SORT_OPTIONS_NO_LEVEL } from '../catalog/listState'

/**
 * Konfigurasi halaman daftar & detail Achievements (untuk CatalogListPage dan AchievementDetailPage). Filter mengikuti
 * heartodex: kategori hobi saja (achievement tidak punya level maupun lokasi). Pencarian mencocokkan nama achievement dan
 * title hadiahnya. Teksnya di src/i18n/messages (`kinds.achievements`, `achievement`).
 */
export const ACHIEVEMENT_KIND = {
  slug: 'achievements',
  name: 'Achievements',
  icon: Trophy,
  entries: achievements,
  totalInGame: ACHIEVEMENTS_TOTAL_IN_GAME,
  entryCategories: ACHIEVEMENT_CATEGORIES,
  detailCategoryEmoji: {},
  sortOptions: SORT_OPTIONS_NO_LEVEL,
  filters: [categoryFilter(ACHIEVEMENT_CATEGORIES)],
  searchText: (entry) => [entry.name, entry.rewardTitle].filter(Boolean),
  href: (entry) => (entry ? `/achievements/${entry.slug}` : '/achievements'),
}
