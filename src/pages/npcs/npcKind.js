import { UsersRound } from 'lucide-react'
import { NPC_CATEGORIES } from '../../data/npcs/categories'
import { NPCS_TOTAL_IN_GAME, npcs } from '../../data/npcs/npcs'
import { LOCATION_FILTER } from '../catalog/filterDefs'
import { SORT_OPTIONS_NO_LEVEL } from '../catalog/listState'

/**
 * Konfigurasi halaman daftar & detail NPCs (untuk CatalogListPage dan NpcDetailPage). Filter mengikuti heartodex:
 * lokasi saja (semua NPC berkategori Common). Pencarian mencocokkan nama dan peran NPC. Teksnya di src/i18n/messages
 * (`kinds.npcs`, `npc`).
 */
export const NPC_KIND = {
  slug: 'npcs',
  name: 'NPCs',
  icon: UsersRound,
  entries: npcs,
  totalInGame: NPCS_TOTAL_IN_GAME,
  entryCategories: NPC_CATEGORIES,
  detailCategoryEmoji: {},
  sortOptions: SORT_OPTIONS_NO_LEVEL,
  filters: [LOCATION_FILTER],
  searchText: (entry) => [entry.name, entry.role].filter(Boolean),
  href: (entry) => (entry ? `/npcs/${entry.slug}` : '/npcs'),
}
