import { ACHIEVEMENT_CATEGORIES } from '../../data/achievements/categories'
import { RECIPE_CATEGORIES } from '../../data/recipes/categories'
import { ACHIEVEMENT_KIND } from '../achievements/achievementKind'
import { sortEntries } from '../catalog/listState'
import { RECIPE_KIND } from '../recipes/recipeKind'
import { WILDLIFE_KINDS } from '../wildlife/wildlifeKinds'

/**
 * Kategori di halaman Checklist (/checklist), urut tab. Semua entri ikut dihitung, termasuk entri event, jadi progresnya
 * sama dengan jumlah di halaman daftar (mis. 42 dari 124 ikan). Urutan entri sama dengan Urutan Default halaman daftar.
 * - `row`: isi baris ringkas ('wildlife': level, lokasi, waktu, cuaca; 'recipe': level & kategori; 'achievement':
 *   kategori hobi & title hadiah).
 * - `catchNow`: punya tampilan Target Sekarang (butuh level, jadwal, cuaca, dan lokasi). `hobby` = nama hobi di game
 *   untuk kolom level (istilah game, tidak diterjemahkan), `maxLevel` = level tertinggi di data.
 * Teks per kategori (label, kata benda) memakai `kinds.<slug>` di src/i18n/messages.
 */
function wildlifeKind(slug, hobby) {
  const kind = WILDLIFE_KINDS[slug]
  return {
    slug,
    name: kind.name,
    icon: kind.icon,
    entries: kind.entries,
    // Skema wildlife (lokasi tunggal/jamak, emoji kategori entri) untuk getEntryLocations & badge kategori.
    wildlife: kind,
    entryCategories: kind.entryCategories,
    row: 'wildlife',
    catchNow: true,
    hobby,
    maxLevel: Math.max(...kind.entries.map((entry) => entry.level ?? 1)),
    href: (entry) => `/wildlife/${slug}/${entry.slug}`,
  }
}

export const CHECKLIST_KINDS = [
  wildlifeKind('fish', 'Fishing'),
  wildlifeKind('bugs', 'Bug Catching'),
  wildlifeKind('birds', 'Birdwatching'),
  {
    slug: 'recipes',
    name: RECIPE_KIND.name,
    icon: RECIPE_KIND.icon,
    entries: sortEntries(RECIPE_KIND.entries, 'default', { rank: RECIPE_KIND.sortRank }),
    entryCategories: RECIPE_CATEGORIES,
    row: 'recipe',
    catchNow: false,
    href: (entry) => `/recipes/${entry.slug}`,
  },
  {
    slug: 'achievements',
    name: ACHIEVEMENT_KIND.name,
    icon: ACHIEVEMENT_KIND.icon,
    entries: ACHIEVEMENT_KIND.entries,
    entryCategories: ACHIEVEMENT_CATEGORIES,
    row: 'achievement',
    catchNow: false,
    href: (entry) => `/achievements/${entry.slug}`,
  },
]

export const DEFAULT_CHECKLIST_KIND = CHECKLIST_KINDS[0].slug

export const getChecklistKind = (slug) => CHECKLIST_KINDS.find((kind) => kind.slug === slug) ?? null
