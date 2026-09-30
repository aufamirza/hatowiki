import { CookingPot } from 'lucide-react'
import { ACHIEVEMENT_KIND } from '../../pages/achievements/achievementKind'
import { COLLECTIBLE_KIND, CROP_KIND, INGREDIENT_KIND, ITEM_KIND } from '../../pages/goods/goodsKinds'
import { NPC_KIND } from '../../pages/npcs/npcKind'
import { RECIPE_KIND } from '../../pages/recipes/recipeKind'
import { WILDLIFE_KINDS } from '../../pages/wildlife/wildlifeKinds'

/**
 * Semua katalog yang punya halaman, dipakai toolbar (menu Wildlife & Wiki, drawer seluler), pencarian global, dan
 * kartu kategori di beranda. Jumlah entri selalu dihitung dari `entries` (termasuk entri event), bukan ditulis manual.
 * - `slug`: kunci warna (data-wildlife, lihat wildlifeTints.css & recipeTint.css) sekaligus segmen URL.
 * - `href(entry?)`: halaman daftar, atau halaman detail kalau diberi entri (tanpa awalan bahasa; komponen tautan dari
 *   src/i18n/LocaleLink menambahkannya).
 * Label, kata benda, hobi, dan deskripsi tiap katalog ada di src/i18n/messages (`kinds.<slug>`, lihat useI18n().kind).
 */
function wildlifeCatalog(slug) {
  const kind = WILDLIFE_KINDS[slug]
  return {
    slug,
    group: 'wildlife',
    name: kind.name,
    icon: kind.icon,
    entries: kind.entries,
    hasSchedule: kind.hasSchedule,
    href: (entry) => (entry ? `/wildlife/${slug}/${entry.slug}` : `/wildlife/${slug}`),
  }
}

export const WILDLIFE_CATALOGS = ['fish', 'bugs', 'birds', 'animals'].map(wildlifeCatalog)

export const RECIPE_CATALOG = {
  slug: 'recipes',
  group: 'recipes',
  name: RECIPE_KIND.name,
  icon: CookingPot,
  entries: RECIPE_KIND.entries,
  hasSchedule: false,
  href: (entry) => (entry ? `/recipes/${entry.slug}` : '/recipes'),
}

// Tanaman, collectible, bahan masak, item, NPC & achievement (grup Wiki bersama resep).
function goodsCatalog(kind) {
  return {
    slug: kind.slug,
    group: 'wiki',
    name: kind.name,
    icon: kind.icon,
    entries: kind.entries,
    hasSchedule: false,
    href: kind.href,
  }
}

export const CROP_CATALOG = goodsCatalog(CROP_KIND)
export const COLLECTIBLE_CATALOG = goodsCatalog(COLLECTIBLE_KIND)
export const INGREDIENT_CATALOG = goodsCatalog(INGREDIENT_KIND)
export const ITEM_CATALOG = goodsCatalog(ITEM_KIND)
export const NPC_CATALOG = goodsCatalog(NPC_KIND)
export const ACHIEVEMENT_CATALOG = goodsCatalog(ACHIEVEMENT_KIND)

// Isi menu "Wiki" di toolbar dan drawer: Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements.
export const WIKI_CATALOGS = [RECIPE_CATALOG, CROP_CATALOG, COLLECTIBLE_CATALOG, INGREDIENT_CATALOG, ITEM_CATALOG, NPC_CATALOG, ACHIEVEMENT_CATALOG]

export const CATALOGS = [...WILDLIFE_CATALOGS, ...WIKI_CATALOGS]
